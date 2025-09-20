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

module.exports = {
  getAllRooms,
};
