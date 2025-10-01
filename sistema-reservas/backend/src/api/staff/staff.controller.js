const staffService = require("./staff.service.js");

const createNewUser = async (req, res) => {
  try {
    const userData = req.body;
    const newUser = await staffService.createUser(userData);
    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error al crear el usuario:", error);

    if (error.code === "DUPLICATE_EMAIL" || error.code === "DUPLICATE_RUT") {
      return res.status(409).json({
        message: error.message,
        code: error.code,
      });
    }

    res.status(500).json({
      message: "Error interno al crear el usuario.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const listAllUsers = async (req, res) => {
  try {
    const users = await staffService.getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    console.error("Error al listar los usuarios:", error);
    res.status(500).json({
      message: "Error interno al obtener los usuarios.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getUserDetails = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);

    if (isNaN(userId)) {
      return res
        .status(400)
        .json({ message: "El ID debe ser un número válido." });
    }

    const user = await staffService.getUserById(userId);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error al obtener detalles del usuario:", error);
    res.status(500).json({
      message: "Error interno al obtener el usuario.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const updateUserInfo = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const userData = req.body;

    if (isNaN(userId)) {
      return res
        .status(400)
        .json({ message: "El ID debe ser un número válido." });
    }

    const updatedUser = await staffService.updateUser(userId, userData);
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error al actualizar el usuario:", error.message);

    if (
      error.message.includes("obligatorio") ||
      error.message.includes("inválido") ||
      error.message.includes("en uso")
    ) {
      return res.status(400).json({ message: error.message });
    }

    if (error.code === "P2025" || error.message.includes("no encontrado")) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    res.status(500).json({
      message: "Error interno al actualizar el usuario.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Obtiene la actividad reciente del usuario autenticado
 */
const getMyActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 15;

    if (limit < 1 || limit > 50) {
      return res
        .status(400)
        .json({ message: "El límite debe estar entre 1 y 50." });
    }

    const activities = await staffService.getUserActivity(userId, limit);
    res.status(200).json(activities);
  } catch (error) {
    console.error("Error al obtener actividad del usuario:", error);
    res.status(500).json({
      message: "Error interno al obtener la actividad.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Obtiene las preferencias del usuario autenticado
 */
const getMyPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = await staffService.getUserPreferences(userId);
    res.status(200).json(preferences);
  } catch (error) {
    console.error("Error al obtener preferencias:", error);
    res.status(500).json({
      message: "Error interno al obtener las preferencias.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Actualiza las preferencias del usuario autenticado
 */
const updateMyPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const preferencesData = req.body;

    const updatedPreferences = await staffService.updateUserPreferences(
      userId,
      preferencesData
    );
    res.status(200).json(updatedPreferences);
  } catch (error) {
    console.error("Error al actualizar preferencias:", error.message);

    if (error.message.includes("no válido")) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({
      message: "Error interno al actualizar las preferencias.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  createNewUser,
  listAllUsers,
  getUserDetails,
  updateUserInfo,
  getMyActivity,
  getMyPreferences,
  updateMyPreferences,
};
