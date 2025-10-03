const express = require('express');
const router = express.Router();
const notificationsController = require('./notifications.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

/**
 * @route GET /api/v1/notifications/checkout-alerts
 * @desc Obtiene todas las alertas de check-out para el día actual (zona horaria Chile)
 * @access Recepcionista y Administrador
 */
router.get(
  '/checkout-alerts',
  authenticate,
  authorize(['receptionist', 'administrator']),
  notificationsController.getCheckoutAlerts
);

/**
 * @route GET /api/v1/notifications/checkout-count
 * @desc Obtiene el conteo de alertas de check-out para mostrar en badge
 * @access Recepcionista y Administrador
 */
router.get(
  '/checkout-count',
  authenticate,
  authorize(['receptionist', 'administrator']),
  notificationsController.getCheckoutAlertsCount
);

module.exports = router;
