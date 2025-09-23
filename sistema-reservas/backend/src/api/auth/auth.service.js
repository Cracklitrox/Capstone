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

    const role = user.user_roles[0]?.roles?.name;

    if (!role) {
      console.error(`💥 Intento de login fallido: El usuario ${email} no tiene un rol asignado.`);
      throw new Error('El usuario no tiene permisos para acceder.');
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      role: role,
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return { token };

  } catch (error) {
    console.error("💥 Error en el servicio de login:", error.message);
    throw new Error('Credenciales inválidas o error de servidor.');
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
        first_name: true,
        paternal_last_name: true,
        maternal_last_name: true,
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

module.exports = {
  login,
  logout,
  getProfile,
};