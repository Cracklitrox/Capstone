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

/**
 * @route GET /api/v1/notifications/past-checkouts
 * @desc Obtiene check-outs de días pasados
 * @query days - Número de días hacia atrás (default: 7)
 * @access Recepcionista y Administrador
 */
router.get(
  '/past-checkouts',
  authenticate,
  authorize(['receptionist', 'administrator']),
  notificationsController.getPastCheckouts
);

/**
 * @route GET /api/v1/notifications/future-checkouts
 * @desc Obtiene check-outs de días futuros
 * @query days - Número de días hacia adelante (default: 7)
 * @access Recepcionista y Administrador
 */
router.get(
  '/future-checkouts',
  authenticate,
  authorize(['receptionist', 'administrator']),
  notificationsController.getFutureCheckouts
);

module.exports = router;
