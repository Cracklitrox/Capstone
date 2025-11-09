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

/**
 * @route   PUT /api/v1/whatsapp/booking-alerts/:alertId/confirm
 * @desc    Confirmar una solicitud de reserva de WhatsApp
 * @access  Private (Solo Recepcionistas)
 */
router.put(
  '/booking-alerts/:alertId/confirm',
  authenticate,
  authorize(['receptionist']),
  whatsappController.confirmWhatsAppBookingAlert
);

/**
 * @route   DELETE /api/v1/whatsapp/booking-alerts/:alertId
 * @desc    Eliminar una alerta de WhatsApp confirmada o rechazada
 * @access  Private (Solo Recepcionistas)
 */
router.delete(
  '/booking-alerts/:alertId',
  authenticate,
  authorize(['receptionist']),
  whatsappController.deleteWhatsAppBookingAlert
);

/**
 * @route   POST /api/v1/whatsapp/booking-alerts/bulk-delete
 * @desc    Eliminar múltiples alertas de WhatsApp confirmadas o rechazadas
 * @access  Private (Solo Recepcionistas)
 */
router.post(
  '/booking-alerts/bulk-delete',
  authenticate,
  authorize(['receptionist']),
  whatsappController.deleteMultipleWhatsAppBookingAlerts
);

module.exports = router;
