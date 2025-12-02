import prisma from "../../db/prisma.client.js";
import bcrypt from "bcryptjs";

/**
 * Crea un nuevo usuario en la base de datos.
 * @param {object} userData
 */
export const createUser = async (userData) => {
  try {
    const { password_hash, ...restOfUserData } = userData;

    const existingUserByEmail = await prisma.users.findUnique({
      where: { email: restOfUserData.email },
    });

    if (existingUserByEmail) {
      const error = new Error("El email ya está registrado");
      error.code = "DUPLICATE_EMAIL";
      throw error;
    }

    if (restOfUserData.identification_number) {
      const existingUserByIdNumber = await prisma.users.findUnique({
        where: { identification_number: restOfUserData.identification_number },
      });

      if (existingUserByIdNumber) {
        const error = new Error("El número de identificación ya está registrado");
        error.code = "DUPLICATE_RUT";
        throw error;
      }
    }

    const hashedPassword = await bcrypt.hash(password_hash, 10);

    const user = await prisma.users.create({
      data: {
        ...restOfUserData,
        password_hash: hashedPassword,
      },
    });

    const { password_hash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    if (error.code === "DUPLICATE_EMAIL" || error.code === "DUPLICATE_RUT") {
      throw error;
    }

    if (error.code === "P2002") {
      const target = error.meta?.target;
      if (target?.includes("email")) {
        const customError = new Error("El email ya está registrado");
        customError.code = "DUPLICATE_EMAIL";
        throw customError;
      }
      if (target?.includes("identification_number")) {
        const customError = new Error("El número de identificación ya está registrado");
        customError.code = "DUPLICATE_RUT";
        throw customError;
      }
    }

    throw error;
  }
};

/**
 * Obtiene una lista de todos los usuarios con su información básica y roles.
 */
export const getAllUsers = () => {
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
export const getUserById = (userId) => {
  return prisma.users.findUnique({
    where: {
      id: userId,
    },
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
export const updateUser = async (userId, userData) => {
  try {
    if (
      userData.hasOwnProperty("first_name") &&
      (!userData.first_name || !userData.first_name.trim())
    )
      throw new Error("El nombre es obligatorio.");
    if (
      userData.hasOwnProperty("paternal_last_name") &&
      (!userData.paternal_last_name || !userData.paternal_last_name.trim())
    )
      throw new Error("El apellido paterno es obligatorio.");
    if (userData.hasOwnProperty("email")) {
      if (!userData.email || !userData.email.trim())
        throw new Error("El correo electrónico es obligatorio.");
      if (!/\S+@\S+\.\S+/.test(userData.email))
        throw new Error("El formato del correo es inválido.");
      const existingUserByEmail = await prisma.users.findFirst({
        where: { email: userData.email, id: { not: userId } },
      });
      if (existingUserByEmail) {
        const error = new Error(
          "El correo electrónico ya está en uso por otro usuario."
        );
        error.code = "DUPLICATE_EMAIL";
        throw error;
      }
    }

    if (
      userData.hasOwnProperty("phone_number") &&
      userData.phone_number &&
      userData.phone_number.trim()
    ) {
      const existingUserByPhone = await prisma.users.findFirst({
        where: {
          phone_number: userData.phone_number,
          id: { not: userId },
        },
      });
      if (existingUserByPhone) {
        throw new Error(
          "El número de teléfono ya está en uso por otro usuario."
        );
      }
    }

    if (
      userData.hasOwnProperty("identification_number") &&
      userData.identification_number &&
      userData.identification_number.trim()
    ) {
      const existingUserByIdNumber = await prisma.users.findFirst({
        where: {
          identification_number: userData.identification_number,
          id: { not: userId },
        },
      });
      if (existingUserByIdNumber) {
        const error = new Error(
          "El número de identificación ya está en uso por otro usuario."
        );
        error.code = "DUPLICATE_RUT";
        throw error;
      }
    }

    const dataToUpdate = { ...userData };
    const optionalFields = [
      "maternal_last_name",
      "phone_number",
      "gender",
      "region",
      "city",
      "country",
    ];
    optionalFields.forEach((field) => {
      if (dataToUpdate.hasOwnProperty(field) && dataToUpdate[field] === "") {
        dataToUpdate[field] = null;
      }
    });
    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        first_name: true,
        paternal_last_name: true,
        maternal_last_name: true,
        phone_number: true,
        gender: true,
        country: true,
        region: true,
        city: true,
        status: true,
        user_roles: { select: { roles: { select: { name: true } } } },
      },
    });
    return updatedUser;
  } catch (error) {
    if (error.code === "P2025") throw new Error("Usuario no encontrado");
    throw error;
  }
};

/**
 * Obtiene la actividad reciente de un usuario
 * @param {number} userId
 * @param {number} limit - Cantidad de registros a devolver
 * @returns {Promise<Array>}
 */
export const getUserActivity = async (userId, limit = 15) => {
  try {
    const activities = await prisma.activity_logs.findMany({
      where: { user_id: userId },
      orderBy: { timestamp: "desc" },
      take: limit,
      select: {
        id: true,
        action: true,
        timestamp: true,
        affected_table: true,
        record_id: true,
        details: true,
      },
    });

    return activities.map((activity) => {
      let parsedDetails = null;
      if (activity.details) {
        try {
          parsedDetails = JSON.parse(activity.details);
        } catch (e) {
          // Si no es JSON válido, devolver como string o null
          parsedDetails = activity.details;
        }
      }
      return {
        id: activity.id,
        action: activity.action,
        timestamp: activity.timestamp,
        affectedTable: activity.affected_table,
        recordId: activity.record_id,
        details: parsedDetails,
      };
    });
  } catch (error) {
    throw new Error("Error al obtener la actividad del usuario.");
  }
};

/**
 * Obtiene las preferencias de un usuario
 * @param {number} userId
 * @returns {Promise<object>}
 */
export const getUserPreferences = async (userId) => {
  try {
    let preferences = await prisma.user_preferences.findUnique({
      where: { user_id: userId },
    });

    // Si no existen preferencias, crear valores por defecto
    if (!preferences) {
      preferences = await prisma.user_preferences.create({
        data: {
          user_id: userId,
          default_theme: "system",
          default_dashboard: null,
        },
      });
    }

    return {
      defaultTheme: preferences.default_theme,
      defaultDashboard: preferences.default_dashboard,
    };
  } catch (error) {
    throw new Error("Error al obtener las preferencias del usuario.");
  }
};

/**
 * Actualiza las preferencias de un usuario
 * @param {number} userId
 * @param {object} preferencesData
 * @returns {Promise<object>}
 */
export const updateUserPreferences = async (userId, preferencesData) => {
  try {
    const { defaultTheme, defaultDashboard } = preferencesData;

    // Validar valores permitidos
    if (defaultTheme && !["light", "dark", "system"].includes(defaultTheme)) {
      throw new Error("Tema no válido. Debe ser: light, dark o system.");
    }

    const dataToUpdate = {};
    if (defaultTheme !== undefined) dataToUpdate.default_theme = defaultTheme;
    if (defaultDashboard !== undefined)
      dataToUpdate.default_dashboard = defaultDashboard;

    const preferences = await prisma.user_preferences.upsert({
      where: { user_id: userId },
      update: dataToUpdate,
      create: {
        user_id: userId,
        default_theme: defaultTheme || "system",
        default_dashboard: defaultDashboard,
      },
    });

    return {
      defaultTheme: preferences.default_theme,
      defaultDashboard: preferences.default_dashboard,
    };
  } catch (error) {
    throw error;
  }
};
