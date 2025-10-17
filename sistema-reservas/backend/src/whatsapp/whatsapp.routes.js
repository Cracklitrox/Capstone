const express = require('express');
const router = express.Router();
const whatsappController = require('./whatsapp.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

/**
 * @route   GET /api/v1/whatsapp/status
 * @desc    Obtener estado del bot de WhatsApp
 * @access  Private (Administrator)
 */
router.get('/status', 
  authenticate, 
  authorize(['administrator']),
  whatsappController.getStatus
);

/**
 * @route   GET /api/v1/whatsapp/qr
 * @desc    Obtener código QR para autenticación
 * @access  Private (Administrator)
 */
router.get('/qr',
  authenticate,
  authorize(['administrator']),
  whatsappController.getQR
);

/**
 * @route   POST /api/v1/whatsapp/disconnect
 * @desc    Desconectar el bot de WhatsApp
 * @access  Private (Administrator)
 */
router.post('/disconnect',
  authenticate,
  authorize(['administrator']),
  whatsappController.disconnect
);

/**
 * @route   POST /api/v1/whatsapp/send
 * @desc    Enviar mensaje manual a un cliente
 * @access  Private (Receptionist, Administrator)
 */
router.post('/send',
  authenticate,
  authorize(['receptionist', 'administrator']),
  whatsappController.sendManualMessage
);

/**
 * @route   GET /api/v1/whatsapp/stats
 * @desc    Obtener estadísticas del bot
 * @access  Private (Receptionist, Administrator)
 */
router.get('/stats',
  authenticate,
  authorize(['receptionist', 'administrator']),
  whatsappController.getStats
);

module.exports = router;
