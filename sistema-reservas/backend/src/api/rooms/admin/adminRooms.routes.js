const express = require('express');
const router = express.Router();

const adminRoomsController = require('./adminRooms.controller');
const authenticate = require('../../../middleware/auth.middleware');
const authorize = require('../../../middleware/authorize.middleware');


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
