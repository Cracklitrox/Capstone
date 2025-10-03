const express = require('express');
const router = express.Router();
const guestsController = require('./guests.controller');
const { authenticate } = require('../../middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Buscar huésped por RUT
router.get('/search/:rut/:rutDv', guestsController.searchGuestByRut);

// Crear nuevo huésped
router.post('/', guestsController.createGuest);

// Actualizar huésped
router.put('/:id', guestsController.updateGuest);

module.exports = router;