const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
// ↓↓↓ LA CORRECCIÓN ESTÁ AQUÍ ↓↓↓
// Importamos la función exportada por defecto y la llamamos 'authenticate'.
const authenticate = require('../../middleware/auth.middleware');

// Rate Limiting configuration
const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 solicitudes por ventana
  message: 'Demasiadas solicitudes desde esta IP. Por favor, inténtalo de nuevo más tarde.'
});

// POST /api/v1/auth/login (Pública)
router.post('/login', authLimiter, authController.loginUser);

// GET /api/v1/auth/profile (Protegida)
// Usamos el middleware 'authenticate' que acabamos de importar correctamente.
router.get('/profile', authLimiter, authenticate, authController.getUserProfile);

// POST /api/v1/auth/logout (Protegida)
router.post('/logout', authLimiter, authenticate, authController.logoutUser);

module.exports = router;