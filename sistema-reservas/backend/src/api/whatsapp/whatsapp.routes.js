const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const whatsappController = require('./whatsapp.controller');

/**
 * @route   GET /api/v1/whatsapp/booking-alerts
 * @desc    Obtener alertas de reservas de WhatsApp
 * @access  Private (Recepcionistas y Administradores)
 */
router.get(
  '/booking-alerts',
  authenticate,
  whatsappController.getWhatsAppBookingAlerts
);

module.exports = router;
