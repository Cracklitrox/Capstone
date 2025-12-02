import * as staffService from "./staff.service.js";
import { logError } from "../../utils/errorLogger.js";

export const createNewUser = async (req, res) => {
  try {
    const userData = req.body;
    const newUser = await staffService.createUser(userData);
    res.status(201).json(newUser);
  } catch (error) {

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al crear usuario: ${error.message}`,
      originModule: "staff.controller - createNewUser",
      severity: "medium",
      errorObject: error,
    });

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

export const listAllUsers = async (req, res) => {
  try {
    const users = await staffService.getAllUsers();
    res.status(200).json(users);
  } catch (error) {

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al listar usuarios: ${error.message}`,
      originModule: "staff.controller - listAllUsers",
      severity: "low",
      errorObject: error,
    });

    res.status(500).json({
      message: "Error interno al obtener los usuarios.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getUserDetails = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);

    if (isNaN(userId)) {
      return res
        .status(400)
        .json({ message: "El ID debe ser un número válido." });
    }

    const user = await staffService.getUserById(userId);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado.", code: "USER_NOT_FOUND" });
    }

    res.status(200).json(user);
  } catch (error) {

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener detalles de usuario ${req.params.id}: ${error.message}`,
      originModule: "staff.controller - getUserDetails",
      severity: "low",
      errorObject: error,
    });

    res.status(500).json({
      message: "Error interno al obtener el usuario.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const updateUserInfo = async (req, res) => {
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

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al actualizar usuario ${req.params.id}: ${error.message}`,
      originModule: "staff.controller - updateUserInfo",
      severity: "medium",
      errorObject: error,
    });

    if (error.code === "DUPLICATE_EMAIL" || error.code === "DUPLICATE_RUT") {
      return res.status(409).json({
        message: error.message,
        code: error.code,
      });
    }

    if (
      error.message.includes("obligatorio") ||
      error.message.includes("inválido") ||
      error.message.includes("en uso")
    ) {
      return res.status(400).json({ message: error.message });
    }

    if (error.code === "P2025" || error.message.includes("no encontrado")) {
      return res.status(404).json({ message: "Usuario no encontrado.", code: "USER_NOT_FOUND" });
    }

    res.status(500).json({
      message: "Error interno al actualizar el usuario.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getMyActivity = async (req, res) => {
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

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener actividad de usuario: ${error.message}`,
      originModule: "staff.controller - getMyActivity",
      severity: "low",
      errorObject: error,
    });

    res.status(500).json({
      message: "Error interno al obtener la actividad.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getMyPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = await staffService.getUserPreferences(userId);
    res.status(200).json(preferences);
  } catch (error) {

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener preferencias de usuario: ${error.message}`,
      originModule: "staff.controller - getMyPreferences",
      severity: "low",
      errorObject: error,
    });

    res.status(500).json({
      message: "Error interno al obtener las preferencias.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const updateMyPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const preferencesData = req.body;

    const updatedPreferences = await staffService.updateUserPreferences(
      userId,
      preferencesData
    );
    res.status(200).json(updatedPreferences);
  } catch (error) {

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al actualizar preferencias: ${error.message}`,
      originModule: "staff.controller - updateMyPreferences",
      severity: "low",
      errorObject: error,
    });

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
