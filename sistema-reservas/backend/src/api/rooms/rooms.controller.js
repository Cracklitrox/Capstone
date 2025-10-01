const roomsService = require("./rooms.service");

/**
 * Controlador para obtener todas las habitaciones.
 * Ejemplo de request: GET /api/rooms
 */
async function getAllRooms(req, res, next) {
  try {
    const rooms = await roomsService.getAllRooms();
    res.json(rooms);
  } catch (error) {
    next(error);
  }
}

/**
 * Controlador para obtener los detalles de una habitación por ID
 */
async function getRoomDetails(req, res, next) {
  try {
    const { id } = req.params;
    const room = await roomsService.getRoomById(id);
    if (!room) {
      return res.status(404).json({ message: "Habitación no encontrada" });
    }
    res.json(room);
  } catch (error) {
    next(error);
  }
}

/**
 * Controlador para obtener todos los tipos de habitación.
 */
async function getAllRoomTypes(req, res, next) {
  try {
    const roomTypes = await roomsService.getAllRoomTypes();
    res.json(roomTypes);
  } catch (error) {
    next(error);
  }
}

/**
 * Controlador para actualizar el estado de una habitación.
 * Ahora registra la actividad del usuario.
 */
async function updateRoomStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "El nuevo estado es requerido." });
    }

    // Obtener información del usuario autenticado desde el middleware
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
    next(error);
  }
}

module.exports = {
  getAllRooms,
  getRoomDetails,
  getAllRoomTypes,
  updateRoomStatus,
};
