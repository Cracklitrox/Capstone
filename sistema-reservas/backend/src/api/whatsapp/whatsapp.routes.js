const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth.middleware');
const whatsappController = require('./whatsapp.controller');

/**
 * @route   GET /api/v1/whatsapp/booking-alerts
 * @desc    Obtener alertas de reservas de WhatsApp no vistas
 * @access  Private (Solo Recepcionistas)
 */
router.get(
  '/booking-alerts',
  authenticate,
  authorize(['receptionist']),
  whatsappController.getWhatsAppBookingAlerts
);

/**
 * @route   PUT /api/v1/whatsapp/mark-as-viewed
 * @desc    Marcar todas las alertas de WhatsApp pendientes como vistas
 * @access  Private (Solo Recepcionistas)
 */
router.put(
  '/mark-as-viewed',
  authenticate,
  authorize(['receptionist']),
  whatsappController.markWhatsAppAlertsAsViewed
);

/**
 * @route   PUT /api/v1/whatsapp/booking-alerts/:alertId/reject
 * @desc    Rechazar una solicitud de reserva de WhatsApp
 * @access  Private (Solo Recepcionistas)
 */
router.put(
  '/booking-alerts/:alertId/reject',
  authenticate,
  authorize(['receptionist']),
  whatsappController.rejectWhatsAppBookingAlert
);

module.exports = router;
