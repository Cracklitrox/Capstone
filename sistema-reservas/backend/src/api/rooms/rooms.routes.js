const express = require('express');
const router = express.Router();
const roomsController = require('./rooms.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

/**
 * @route GET /api/v1/rooms
 * @desc Lista todas las habitaciones
 */
router.get('/', authenticate, roomsController.getAllRooms);

/**
 * @route GET /api/v1/rooms/types
 * @desc Lista todos los tipos de habitación
 */
router.get('/types', authenticate, roomsController.getAllRoomTypes);

/**
 * @route GET /api/v1/rooms/:id
 * @desc Obtiene los detalles de una habitación específica
 */
// --- CORRECCIÓN AQUÍ ---
// El nombre correcto de la función en el controlador es 'getRoomById'
router.get('/:id', authenticate, roomsController.getRoomDetails);

/**
 * @route PATCH /api/v1/rooms/:id/status
 * @desc Actualiza el estado de una habitación
 */
router.patch(
  '/:id/status', 
  authenticate, 
  authorize(['administrator', 'receptionist']), 
  roomsController.updateRoomStatus
);

module.exports = router;