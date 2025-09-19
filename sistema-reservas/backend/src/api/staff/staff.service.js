const prisma = require('../../db/prisma.client');
const bcrypt = require('bcryptjs');

/**
 * Crea un nuevo usuario en la base de datos.
 * @param {object} userData
 */
const createUser = async (userData) => {
  try {
    const { password_hash, ...restOfUserData } = userData;

    // Verificar si el email ya existe
    const existingUserByEmail = await prisma.users.findUnique({
      where: { email: restOfUserData.email }
    });

    if (existingUserByEmail) {
      const error = new Error('El email ya está registrado');
      error.code = 'DUPLICATE_EMAIL';
      throw error;
    }

    // Verificar si el RUT ya existe
    const existingUserByRut = await prisma.users.findUnique({
      where: { rut: restOfUserData.rut }
    });

    if (existingUserByRut) {
      const error = new Error('El RUT ya está registrado');
      error.code = 'DUPLICATE_RUT';
      throw error;
    }

    const hashedPassword = await bcrypt.hash(password_hash, 10);

    // Creamos el usuario en la base de datos
    const user = await prisma.users.create({
      data: {
        ...restOfUserData,
        password_hash: hashedPassword,
      },
    });

    const { password_hash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
    
  } catch (error) {
    // Re-lanzar errores personalizados
    if (error.code === 'DUPLICATE_EMAIL' || error.code === 'DUPLICATE_RUT') {
      throw error;
    }
    
    // Manejar errores de Prisma
    if (error.code === 'P2002') {
      // P2002 es el código de Prisma para violación de unique constraint
      const target = error.meta?.target;
      if (target?.includes('email')) {
        const customError = new Error('El email ya está registrado');
        customError.code = 'DUPLICATE_EMAIL';
        throw customError;
      }
      if (target?.includes('rut')) {
        const customError = new Error('El RUT ya está registrado');
        customError.code = 'DUPLICATE_RUT';
        throw customError;
      }
    }
    
    console.error('Error en createUser:', error);
    
    // Para otros errores, re-lanzar
    throw error;
  }
};

/**
 * Obtiene una lista de todos los usuarios con su información básica y roles.
 */
const getAllUsers = () => {
  return prisma.users.findMany({
    select: {
      id: true,
      email: true,
      first_name: true,
      paternal_last_name: true,
      status: true,
      user_roles: {
        select: {
          roles: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
};

/**
 * Obtiene un usuario por su ID.
 * @param {number} userId
 * @returns {Promise<object|null>}
 */
const getUserById = (userId) => {
  return prisma.users.findUnique({
    where: {
      id: userId,
    },
    // Seleccionamos los campos que queremos mostrar
    select: {
      id: true,
      email: true,
      first_name: true,
      paternal_last_name: true,
      status: true,
      user_roles: {
        select: {
          roles: { select: { name: true } },
        },
      },
    },
  });
};

/**
 * Actualiza un usuario en la base de datos.
 * @param {number} userId
 * @param {object} userData
 * @returns {Promise<object>}
 */
const updateUser = async (userId, userData) => {
  try {
    // Verificar si el usuario existe
    const existingUser = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      const error = new Error('Usuario no encontrado');
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    return await prisma.users.update({
      where: {
        id: userId,
      },
      data: userData,
    });
  } catch (error) {
    // Re-lanzar errores personalizados
    if (error.code === 'USER_NOT_FOUND') {
      throw error;
    }
    
    // Manejar errores de Prisma
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      if (target?.includes('email')) {
        const customError = new Error('El email ya está registrado');
        customError.code = 'DUPLICATE_EMAIL';
        throw customError;
      }
      if (target?.includes('rut')) {
        const customError = new Error('El RUT ya está registrado');
        customError.code = 'DUPLICATE_RUT';
        throw customError;
      }
    }
    
    if (error.code === 'P2025') {
      // P2025 es el código de Prisma para registro no encontrado
      const customError = new Error('Usuario no encontrado');
      customError.code = 'USER_NOT_FOUND';
      throw customError;
    }
    
    // Para otros errores, re-lanzar
    throw error;
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
};