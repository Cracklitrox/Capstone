// Rutas para el manejo de habitaciones
const express = require('express');
const router = express.Router();
const roomsController = require('./rooms.controller');

/**
 * @route GET /api/rooms
 * @desc Lista todas las habitaciones, permite filtrar por estado y tipo de habitación
 * @queryParam {string} status - Estado de la habitación (opcional)
 * @queryParam {number} room_type_id - ID del tipo de habitación (opcional)
 * @returns {Array} Lista de habitaciones
 */
router.get('/', roomsController.getRooms);

// Exporta el router para ser usado en el archivo principal de rutas
module.exports = router;
