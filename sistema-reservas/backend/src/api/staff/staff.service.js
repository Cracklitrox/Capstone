const prisma = require('../../db/prisma.client');
const bcrypt = require('bcryptjs');

/**
 * Crea un nuevo usuario en la base de datos.
 * @param {object} userData
 */
const createUser = async (userData) => {
  const { password_hash, ...restOfUserData } = userData;

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
const updateUser = (userId, userData) => {
  return prisma.users.update({
    where: {
      id: userId,
    },
    data: userData,
  });
};


module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
};