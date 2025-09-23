const roomsService = require('./rooms.service');

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
      return res.status(404).json({ message: 'Habitación no encontrada' });
    }
    res.json(room);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllRooms,
  getRoomDetails,
};
