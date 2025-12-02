import * as authService from "./auth.service.js";
import { logError } from "../../utils/errorLogger.js";

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ message: "El email es requerido." });
    }
    if (!password) {
      return res.status(400).json({ message: "La contraseña es requerida." });
    }

    const result = await authService.login(email, password, req);
    res.status(200).json(result);
  } catch (error) {

    // Logging crítico - intentos de login fallidos
    await logError({
      userId: null, // No hay userId en login fallido
      userRole: null,
      description: `Intento de login fallido - Email: ${req.body.email} - Error: ${error.message}`,
      originModule: "auth.controller - loginUser",
      severity: "medium",
      errorObject: error,
    });

    res.status(401).json({ message: error.message });
  }
};

export const logoutUser = async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader.split(" ")[1];
    const result = await authService.logout(token);
    res.status(200).json(result);
  } catch (error) {

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al cerrar sesión: ${error.message}`,
      originModule: "auth.controller - logoutUser",
      severity: "low",
      errorObject: error,
    });

    res.status(500).json({ message: "Error interno al cerrar sesión." });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const userProfile = await authService.getProfile(userId);
    if (!userProfile) {
      return res
        .status(404)
        .json({ message: "Perfil de usuario no encontrado." });
    }
    res.status(200).json(userProfile);
  } catch (error) {

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener perfil: ${error.message}`,
      originModule: "auth.controller - getUserProfile",
      severity: "medium",
      errorObject: error,
    });

    res.status(500).json({ message: "Error interno al obtener el perfil." });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileData = req.body;

    const updatedProfile = await authService.updateProfile(userId, profileData);
    res.status(200).json(updatedProfile);
  } catch (error) {

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al actualizar perfil: ${error.message}`,
      originModule: "auth.controller - updateProfile",
      severity: "medium",
      errorObject: error,
    });

    if (
      error.message.includes("obligatorio") ||
      error.message.includes("inválido") ||
      error.message.includes("en uso")
    ) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Error interno al actualizar el perfil." });
  }
};

export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const result = await authService.changePassword(
      userId,
      currentPassword,
      newPassword,
      confirmPassword
    );

    res.status(200).json(result);
  } catch (error) {

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al cambiar contraseña: ${error.message}`,
      originModule: "auth.controller - changePassword",
      severity: "high", // Alta porque es seguridad
      errorObject: error,
    });

    if (
      error.message.includes("incorrecta") ||
      error.message.includes("coinciden")
    ) {
      return res.status(400).json({ message: error.message });
    }

    if (error.message.includes("no encontrado")) {
      return res.status(404).json({ message: error.message });
    }

    res
      .status(500)
      .json({ message: "Error interno al cambiar la contraseña." });
  }
};

export const getLoginHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const history = await authService.getLoginHistory(userId);
    res.status(200).json(history);
  } catch (error) {

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener historial de login: ${error.message}`,
      originModule: "auth.controller - getLoginHistory",
      severity: "low",
      errorObject: error,
    });

    res.status(500).json({ message: "Error interno al obtener el historial." });
  }
};
