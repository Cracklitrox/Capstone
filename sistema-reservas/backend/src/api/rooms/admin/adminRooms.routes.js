const express = require('express');
const router = express.Router();

// Rate limiting middleware
const rateLimit = require('express-rate-limit');

// Limit each IP to 100 requests per 15 minutes for admin routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to all routes in this router
router.use(limiter);

const adminRoomsController = require('./adminRooms.controller');
const { authenticate, authorize } = require('../../../middleware/auth.middleware');


// Listar habitaciones y tipos
router.get('/', authenticate, authorize(['administrator']), adminRoomsController.listRooms);
router.get('/room-types', authenticate, authorize(['administrator']), adminRoomsController.listRoomTypes);

// Crear
router.post('/', authenticate, authorize(['administrator']), adminRoomsController.createRoom);
router.post('/room-types', authenticate, authorize(['administrator']), adminRoomsController.createRoomType);

// Modificar
router.put('/:id', authenticate, authorize(['administrator']), adminRoomsController.updateRoom);
router.put('/room-types/:id', authenticate, authorize(['administrator']), adminRoomsController.updateRoomType);

// Eliminar
router.delete('/:id', authenticate, authorize(['administrator']), adminRoomsController.deleteRoom);
router.delete('/room-types/:id', authenticate, authorize(['administrator']), adminRoomsController.deleteRoomType);

// Ver más
router.get('/:id', authenticate, authorize(['administrator']), adminRoomsController.getRoomDetail);
router.get('/room-types/:id', authenticate, authorize(['administrator']), adminRoomsController.getRoomTypeDetail);

module.exports = router;
