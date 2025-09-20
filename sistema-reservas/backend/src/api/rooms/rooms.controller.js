const roomsService = require('./rooms.service');

/**
 * Controlador para obtener habitaciones.
 * Permite filtrar por estado y tipo de habitación usando query params.
 */
async function getRooms(req, res, next) {
  try {
    // Extrae los filtros desde la query string
    const { status, room_type_id } = req.query;
    // Llama al servicio para obtener las habitaciones filtradas
    const rooms = await roomsService.getRooms({ status, room_type_id });
    // Devuelve la lista de habitaciones como JSON
    res.json(rooms);
  } catch (error) {
    // Pasa el error al middleware de manejo de errores
    next(error);
  }
}

// Exporta el controlador para ser usado en las rutas
module.exports = {
  getRooms,
};
