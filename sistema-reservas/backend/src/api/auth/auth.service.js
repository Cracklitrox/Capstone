const prisma = require('../../db/prisma.client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const redisClient = require('../../db/redis.client')

const login = async (email, password) => {
  try {
    if (!email || !password) {
      throw new Error('Credenciales inválidas');
    }

    const user = await prisma.users.findUnique({
      where: { email },
      include: {
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

    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new Error('Credenciales inválidas');
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    const { password_hash, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };

  } catch (error) {
    console.error("💥 Error en el servicio de login:", error);
    throw new Error('Credenciales inválidas');
  }
};

const logout = async (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return { message: 'Token inválido.' };
    }

    const expirationTime = decoded.exp;
    const currentTime = Math.floor(Date.now() / 1000);
    const ttl = expirationTime - currentTime;

    if (ttl <= 0) {
      return { message: 'El token ya ha expirado.' };
    }

    await redisClient.set(token, 'blocked', {
      EX: ttl,
    });

    return { message: 'Sesión cerrada exitosamente.' };
  } catch(error) {
    console.error("💥 Error en el servicio de logout:", error);
    throw new Error('Error al intentar cerrar sesión.');
  }
};

const getProfile = async (userId) => {
  try {
    return prisma.users.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        rut: true,
        rut_dv: true,
        first_name: true,
        paternal_last_name: true,
        maternal_last_name: true,
        phone_number: true,
        gender: true,
        country: true,
        region: true,
        city: true,
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
  } catch(error) {
    console.error("💥 Error en el servicio getProfile:", error);
    throw new Error('Error al obtener el perfil de usuario.');
  }
};

// ACTUALIZAR PERFIL DE USUARIO
const updateProfile = async (userId, profileData) => {
  try {
    // ... (La validación de nombre, apellido y email se mantiene igual)
    if (profileData.first_name === '' || !profileData.first_name) throw new Error('El nombre es obligatorio.');
    if (profileData.paternal_last_name === '' || !profileData.paternal_last_name) throw new Error('El apellido paterno es obligatorio.');
    if (profileData.email === '' || !profileData.email) throw new Error('El correo electrónico es obligatorio.');
    if (!/\S+@\S+\.\S+/.test(profileData.email)) throw new Error('El formato del correo es inválido.');

    const existingUserByEmail = await prisma.users.findFirst({
      where: { email: profileData.email, id: { not: userId } }
    });
    if (existingUserByEmail) {
      throw new Error('El correo electrónico ya está en uso por otro usuario.');
    }
    
    // --- VALIDACIÓN DE TELÉFONO AÑADIDA ---
    if (profileData.phone_number && profileData.phone_number.trim()) {
      const existingUserByPhone = await prisma.users.findFirst({
        where: {
          phone_number: profileData.phone_number,
          id: { not: userId }
        }
      });
      if (existingUserByPhone) {
        throw new Error('El número de teléfono ya está en uso por otro usuario.');
      }
    }
    
    // ... (El resto de la función se mantiene igual)
    const dataToUpdate = {};
    const allowedFields = ['first_name', 'paternal_last_name', 'maternal_last_name', 'email', 'phone_number', 'gender', 'country', 'region', 'city'];
    allowedFields.forEach(field => { if (profileData[field] !== undefined) { dataToUpdate[field] = profileData[field] === '' ? null : profileData[field]; }});
    const updatedUser = await prisma.users.update({ where: { id: userId }, data: dataToUpdate, select: { id: true, email: true, rut: true, rut_dv: true, first_name: true, paternal_last_name: true, maternal_last_name: true, phone_number: true, gender: true, status: true, country: true, region: true, city: true, user_roles: { select: { roles: { select: { name: true } } } }, } });
    return updatedUser;
  } catch (error) {
    if (error.code === 'P2025') throw new Error('El usuario que intentas actualizar no existe.');
    console.error("💥 Error en el servicio updateProfile:", error.message);
    throw error;
  }
};

module.exports = {
  login,
  logout,
  getProfile,
  updateProfile,
};