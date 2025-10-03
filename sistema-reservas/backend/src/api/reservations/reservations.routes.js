const express = require('express');
const router = express.Router();
const reservationsController = require('./reservations.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

// Buscar disponibilidad (receptionist y administrator)
router.get(
  '/search-availability',
  authorize(['receptionist', 'administrator']),
  reservationsController.searchAvailability
);

// Calcular precio estimado
router.post(
  '/calculate-price',
  authorize(['receptionist', 'administrator']),
  reservationsController.calculatePrice
);

// Obtener servicios disponibles
router.get(
  '/services',
  authorize(['receptionist', 'administrator']),
  reservationsController.getAvailableServices
);

// Crear reserva (solo receptionist y administrator)
router.post(
  '/',
  authorize(['receptionist', 'administrator']),
  reservationsController.createReservation
);

module.exports = router;