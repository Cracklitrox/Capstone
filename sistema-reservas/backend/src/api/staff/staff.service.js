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
 * Actualiza un usuario en la base de datos con validaciones completas.
 * @param {number} userId - El ID del usuario a actualizar.
 * @param {object} userData - Los datos a actualizar.
 * @returns {Promise<object>} - El objeto del usuario actualizado.
 */

// Actualiza un usuario con validaciones adicionales
const updateUser = async (userId, userData) => {
  try {
    // ... (La validación de nombre, apellido y email se mantiene igual)
    if (userData.hasOwnProperty('first_name') && (!userData.first_name || !userData.first_name.trim())) throw new Error('El nombre es obligatorio.');
    if (userData.hasOwnProperty('paternal_last_name') && (!userData.paternal_last_name || !userData.paternal_last_name.trim())) throw new Error('El apellido paterno es obligatorio.');
    if (userData.hasOwnProperty('email')) {
      if (!userData.email || !userData.email.trim()) throw new Error('El correo electrónico es obligatorio.');
      if (!/\S+@\S+\.\S+/.test(userData.email)) throw new Error('El formato del correo es inválido.');
      const existingUserByEmail = await prisma.users.findFirst({ where: { email: userData.email, id: { not: userId } } });
      if (existingUserByEmail) throw new Error('El correo electrónico ya está en uso por otro usuario.');
    }

    // --- VALIDACIÓN DE TELÉFONO AÑADIDA ---
    if (userData.hasOwnProperty('phone_number') && userData.phone_number && userData.phone_number.trim()) {
      const existingUserByPhone = await prisma.users.findFirst({
        where: {
          phone_number: userData.phone_number,
          id: { not: userId }
        }
      });
      if (existingUserByPhone) {
        throw new Error('El número de teléfono ya está en uso por otro usuario.');
      }
    }

    const dataToUpdate = { ...userData };
    // Campos opcionales
    const optionalFields = ['maternal_last_name', 'phone_number', 'gender', 'region', 'city', 'country'];
    optionalFields.forEach(field => { if (dataToUpdate.hasOwnProperty(field) && dataToUpdate[field] === '') { dataToUpdate[field] = null; } });
    const updatedUser = await prisma.users.update({ where: { id: userId }, data: dataToUpdate, select: { id: true, email: true, first_name: true, paternal_last_name: true, maternal_last_name: true, phone_number: true, gender: true, country: true, region: true, city: true, status: true, user_roles: { select: { roles: { select: { name: true } } } }, } });
    return updatedUser;
  } catch (error) {
    if (error.code === 'P2025') throw new Error('Usuario no encontrado');
    throw error;
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
};