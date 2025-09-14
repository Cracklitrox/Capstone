const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
// ↓↓↓ LA CORRECCIÓN ESTÁ AQUÍ ↓↓↓
// Importamos la función exportada por defecto y la llamamos 'authenticate'.
const authenticate = require('../../middleware/auth.middleware');

// POST /api/v1/auth/login (Pública)
router.post('/login', authController.loginUser);

// GET /api/v1/auth/profile (Protegida)
// Usamos el middleware 'authenticate' que acabamos de importar correctamente.
router.get('/profile', authenticate, authController.getUserProfile);

// POST /api/v1/auth/logout (Protegida)
router.post('/logout', authenticate, authController.logoutUser);

module.exports = router;