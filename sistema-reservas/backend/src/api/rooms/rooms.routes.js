// Rutas para el manejo de habitaciones
const express = require('express');
const router = express.Router();
const roomsController = require('./rooms.controller');


/**
 * @route GET /api/rooms
 * @desc Lista todas las habitaciones
 * @returns {Array} Lista de habitaciones
 */
router.get('/', roomsController.getAllRooms);

/**
 * @route GET /api/rooms/:id
 * @desc Obtiene los detalles de una habitación específica
 * @returns {Object} Detalles de la habitación
 */
router.get('/:id', roomsController.getRoomDetails);

// Exporta el router para ser usado en el archivo principal de rutas
module.exports = router;
