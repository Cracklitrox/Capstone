import prisma from "../../db/prisma.client.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import redisClient from "../../db/redis.client.js";

export const login = async (email, password, req) => {
  try {
    if (!email || !password) {
      throw new Error("Credenciales inválidas");
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
      throw new Error("Credenciales inválidas");
    }

    // Verificar si el usuario tiene permiso para iniciar sesión
    if (user.can_login === false) {
      throw new Error("Este usuario no tiene permisos para iniciar sesión en el sistema.");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new Error("Credenciales inválidas");
    }

    const role = user.user_roles[0]?.roles?.name;

    if (!role) {
      throw new Error("El usuario no tiene permisos para acceder.");
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      paternalLastName: user.paternal_last_name,
      role: role,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers["user-agent"];

      await prisma.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress: ipAddress,
          userAgent: userAgent,
        },
      });
    } catch (logError) {
    }

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        paternalLastName: user.paternal_last_name,
        role: role,
      },
    };
  } catch (error) {

    if (
      error.message === "Credenciales inválidas" ||
      error.message === "El usuario no tiene permisos para acceder."
    ) {
      throw error;
    }

    throw new Error("Credenciales inválidas o error de servidor.");
  }
};

export const logout = async (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return { message: "Token inválido." };
    }

    const expirationTime = decoded.exp;
    const currentTime = Math.floor(Date.now() / 1000);
    const ttl = expirationTime - currentTime;

    if (ttl <= 0) {
      return { message: "El token ya ha expirado." };
    }

    await redisClient.set(token, "blocked", {
      EX: ttl,
    });

    return { message: "Sesión cerrada exitosamente." };
  } catch (error) {
    throw new Error("Error al intentar cerrar sesión.");
  }
};

export const getProfile = async (userId) => {
  try {
    return prisma.users.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        identification_number: true,
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
  } catch (error) {
    throw new Error("Error al obtener el perfil de usuario.");
  }
};

export const updateProfile = async (userId, profileData) => {
  try {
    if (profileData.first_name === "" || !profileData.first_name)
      throw new Error("El nombre es obligatorio.");

    if (profileData.paternal_last_name === "" || !profileData.paternal_last_name)
      throw new Error("El apellido paterno es obligatorio.");

    if (profileData.maternal_last_name === "" || !profileData.maternal_last_name)
      throw new Error("El apellido materno es obligatorio.");

    if (profileData.phone_number === "" || !profileData.phone_number)
      throw new Error("El teléfono es obligatorio.");

    if (profileData.country === "" || !profileData.country)
      throw new Error("El país es obligatorio.");

    if (profileData.region === "" || !profileData.region)
      throw new Error("La región es obligatoria.");

    if (profileData.city === "" || !profileData.city)
      throw new Error("La ciudad es obligatoria.");

    if (profileData.email && !/\S+@\S+\.\S+/.test(profileData.email))
      throw new Error("El formato del correo es inválido.");

    if (profileData.email) {
      const existingUserByEmail = await prisma.users.findFirst({
        where: { email: profileData.email, id: { not: userId } },
      });
      if (existingUserByEmail) {
        throw new Error("El correo electrónico ya está en uso por otro usuario.");
      }
    }

    if (profileData.phone_number && profileData.phone_number.trim()) {
      const existingUserByPhone = await prisma.users.findFirst({
        where: {
          phone_number: profileData.phone_number,
          id: { not: userId },
        },
      });
      if (existingUserByPhone) {
        throw new Error("El número de teléfono ya está en uso por otro usuario.");
      }
    }

    const dataToUpdate = {};
    const allowedFields = [
      "first_name",
      "paternal_last_name",
      "maternal_last_name",
      "email",
      "phone_number",
      "gender",
      "country",
      "region",
      "city",
    ];

    allowedFields.forEach((field) => {
      if (profileData[field] !== undefined) {
        if (field === 'email') {
          dataToUpdate[field] = profileData[field] === "" ? null : profileData[field];
        } else {
          dataToUpdate[field] = profileData[field];
        }
      }
    });

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        identification_number: true,
        first_name: true,
        paternal_last_name: true,
        maternal_last_name: true,
        phone_number: true,
        gender: true,
        status: true,
        country: true,
        region: true,
        city: true,
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
    return updatedUser;
  } catch (error) {
    if (error.code === "P2025")
      throw new Error("El usuario que intentas actualizar no existe.");
    throw error;
  }
};

export const changePassword = async (
  userId,
  currentPassword,
  newPassword,
  confirmPassword
) => {
  try {
    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new Error("Todos los campos son obligatorios.");
    }
    if (newPassword !== confirmPassword) {
      throw new Error("La nueva contraseña y la confirmación no coinciden.");
    }
    if (newPassword.length < 8) {
      throw new Error("La nueva contraseña debe tener al menos 8 caracteres.");
    }

    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error("Usuario no encontrado.");
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );
    if (!isPasswordValid) {
      throw new Error("La contraseña actual es incorrecta.");
    }
    const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
    if (isSamePassword) {
      throw new Error("La nueva contraseña debe ser diferente a la actual.");
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await prisma.users.update({
      where: { id: userId },
      data: { password_hash: newPasswordHash },
    });

    return { message: "Contraseña actualizada correctamente." };
  } catch (error) {
    throw error;
  }
};

export const getLoginHistory = async (userId) => {
  try {
    return prisma.loginHistory.findMany({
      where: { userId: userId },
      orderBy: { timestamp: "desc" },
      take: 10,
    });
  } catch (error) {
    throw new Error("Error al obtener el historial de inicios de sesión.");
  }
};
