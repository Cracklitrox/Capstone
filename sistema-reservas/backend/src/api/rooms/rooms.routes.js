const express = require('express');
const router = express.Router();
const roomsController = require('./rooms.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const { getAvailableUpgrades } = require('../reservations/rooms-modification.controller');

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
 * @route GET /api/v1/rooms/available-upgrades
 * @desc Obtiene habitaciones disponibles para upgrade de una reserva
 * @query reservationId - ID de la reserva
 */
router.get('/available-upgrades', authenticate, getAvailableUpgrades);

/**
 * @route GET /api/v1/rooms/ready-for-cleaning
 * @desc Obtiene habitaciones listas para limpieza (después de checkout)
 */
router.get(
  '/ready-for-cleaning',
  authenticate,
  authorize(['administrator', 'receptionist']),
  roomsController.getRoomsReadyForCleaning
);

/**
 * @route GET /api/v1/rooms/cleaning
 * @desc Obtiene todas las habitaciones en estado de limpieza
 */
router.get(
  '/cleaning',
  authenticate,
  authorize(['administrator', 'receptionist']),
  roomsController.getRoomsInCleaning
);

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

/**
 * @route POST /api/v1/rooms/:id/start-cleaning
 * @desc Inicia el proceso de limpieza manual de una habitación (occupied → cleaning)
 */
router.post(
  '/:id/start-cleaning',
  authenticate,
  authorize(['administrator', 'receptionist']),
  roomsController.startCleaning
);

/**
 * @route POST /api/v1/rooms/:id/complete-cleaning
 * @desc Marca una habitación como limpia y cambia su estado a 'available'
 */
router.post(
  '/:id/complete-cleaning',
  authenticate,
  authorize(['administrator', 'receptionist']),
  roomsController.completeCleaning
);

/**
 * @route PATCH /api/v1/rooms/:id/cleaning-observations
 * @desc Actualiza las observaciones de limpieza de una habitación
 */
router.patch(
  '/:id/cleaning-observations',
  authenticate,
  authorize(['administrator', 'receptionist']),
  roomsController.updateCleaningObservations
);

module.exports = router;