const roomsService = require("./rooms.service");
const { logError } = require("../../utils/errorLogger");

/**
 * Controlador para obtener todas las habitaciones.
 */
async function getAllRooms(req, res) {
  try {
    const rooms = await roomsService.getAllRooms();
    res.json(rooms);
  } catch (error) {
    console.error("Error al obtener habitaciones:", error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener habitaciones: ${error.message}`,
      originModule: "rooms.controller - getAllRooms",
      severity: "low",
      errorObject: error,
    });

    res.status(500).json({
      message: "Error al obtener habitaciones",
      error: error.message,
    });
  }
}

/**
 * Controlador para obtener los detalles de una habitación por ID
 */
async function getRoomDetails(req, res) {
  try {
    const { id } = req.params;
    const room = await roomsService.getRoomById(id);

    if (!room) {
      return res.status(404).json({ message: "Habitación no encontrada" });
    }

    res.json(room);
  } catch (error) {
    console.error("Error al obtener detalles de habitación:", error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener detalles de habitación ${req.params.id}: ${error.message}`,
      originModule: "rooms.controller - getRoomDetails",
      severity: "low",
      errorObject: error,
    });

    res.status(500).json({
      message: "Error al obtener detalles de la habitación",
      error: error.message,
    });
  }
}

/**
 * Controlador para obtener todos los tipos de habitación.
 */
async function getAllRoomTypes(req, res) {
  try {
    const roomTypes = await roomsService.getAllRoomTypes();
    res.json(roomTypes);
  } catch (error) {
    console.error("Error al obtener tipos de habitación:", error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener tipos de habitación: ${error.message}`,
      originModule: "rooms.controller - getAllRoomTypes",
      severity: "low",
      errorObject: error,
    });

    res.status(500).json({
      message: "Error al obtener tipos de habitación",
      error: error.message,
    });
  }
}

/**
 * Controlador para actualizar el estado de una habitación.
 * Ahora registra la actividad del usuario.
 */
async function updateRoomStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "El nuevo estado es requerido." });
    }

    const userId = req.user?.id;
    const userRole = req.user?.role;

    const updatedRoom = await roomsService.updateRoomStatus(
      id,
      status,
      userId,
      userRole
    );

    res.json(updatedRoom);
  } catch (error) {
    console.error("Error al actualizar estado de habitación:", error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al actualizar estado de habitación ${req.params.id} a ${req.body.status}: ${error.message}`,
      originModule: "rooms.controller - updateRoomStatus",
      severity: "medium",
      errorObject: error,
    });

    res.status(500).json({
      message: "Error al actualizar estado de la habitación",
      error: error.message,
    });
  }
}

/**
 * Controlador para obtener habitaciones listas para limpieza
 */
async function getRoomsReadyForCleaning(req, res) {
  try {
    const rooms = await roomsService.getRoomsReadyForCleaning();
    res.json({ rooms });
  } catch (error) {
    console.error('Error al obtener habitaciones listas para limpieza:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener habitaciones listas para limpieza: ${error.message}`,
      originModule: 'rooms.controller - getRoomsReadyForCleaning',
      severity: 'low',
      errorObject: error,
    });

    res.status(500).json({
      message: 'Error al obtener habitaciones listas para limpieza',
      error: error.message,
    });
  }
}

/**
 * Controlador para obtener habitaciones en limpieza
 */
async function getRoomsInCleaning(req, res) {
  try {
    const rooms = await roomsService.getRoomsInCleaning();
    res.json({ rooms });
  } catch (error) {
    console.error('Error al obtener habitaciones en limpieza:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener habitaciones en limpieza: ${error.message}`,
      originModule: 'rooms.controller - getRoomsInCleaning',
      severity: 'low',
      errorObject: error,
    });

    res.status(500).json({
      message: 'Error al obtener habitaciones en limpieza',
      error: error.message,
    });
  }
}

/**
 * Controlador para completar limpieza de una habitación
 */
async function completeCleaning(req, res) {
  try {
    const { id } = req.params;
    const { observations } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const result = await roomsService.completeCleaning(
      id,
      observations,
      userId,
      userRole
    );

    res.json(result);
  } catch (error) {
    console.error('Error al completar limpieza:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al completar limpieza de habitación ${req.params.id}: ${error.message}`,
      originModule: 'rooms.controller - completeCleaning',
      severity: 'medium',
      errorObject: error,
    });

    res.status(500).json({
      message: error.message || 'Error al completar limpieza',
    });
  }
}

/**
 * Controlador para actualizar observaciones de limpieza
 */
async function updateCleaningObservations(req, res) {
  try {
    const { id } = req.params;
    const { observations } = req.body;
    const userId = req.user?.id;

    if (!observations) {
      return res.status(400).json({
        message: 'Las observaciones son requeridas',
      });
    }

    const result = await roomsService.updateCleaningObservations(
      id,
      observations,
      userId
    );

    res.json(result);
  } catch (error) {
    console.error('Error al actualizar observaciones:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al actualizar observaciones de habitación ${req.params.id}: ${error.message}`,
      originModule: 'rooms.controller - updateCleaningObservations',
      severity: 'low',
      errorObject: error,
    });

    res.status(500).json({
      message: error.message || 'Error al actualizar observaciones',
    });
  }
}

/**
 * Controlador para iniciar limpieza manual de una habitación
 */
async function startCleaning(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const result = await roomsService.startCleaning(id, userId, userRole);

    res.json(result);
  } catch (error) {
    console.error('Error al iniciar limpieza:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al iniciar limpieza de habitación ${req.params.id}: ${error.message}`,
      originModule: 'rooms.controller - startCleaning',
      severity: 'medium',
      errorObject: error,
    });

    res.status(500).json({
      message: error.message || 'Error al iniciar limpieza',
    });
  }
}

module.exports = {
  getAllRooms,
  getRoomDetails,
  getAllRoomTypes,
  updateRoomStatus,
  getRoomsReadyForCleaning,
  getRoomsInCleaning,
  completeCleaning,
  updateCleaningObservations,
  startCleaning,
};
