const express = require('express');
const staffController = require('./staff.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

const RateLimit = require('express-rate-limit');
const router = express.Router();

// Configuración de rate limiter: máximo 100 solicitudes por 15 minutos por IP
const limiter = RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 solicitudes por ventana
  standardHeaders: true, // devuelve información de rate limit en los headers
  legacyHeaders: false, // desactiva los headers x-rate-limit obsoletos
});

// Aplica el rate limiter a todas las rutas de este router
router.use(limiter);

// --- Rutas de gestión de usuarios (solo administradores) ---

// POST /: Solo administradores pueden crear personal
router.post('/', authenticate, authorize(['administrator']), staffController.createNewUser);

// GET /: Solo administradores pueden listar personal  
router.get('/', authenticate, authorize(['administrator']), staffController.listAllUsers);

// GET /:id: Solo administradores pueden ver detalles del personal
router.get('/:id', authenticate, authorize(['administrator']), staffController.getUserDetails);

// PUT /:id: Solo administradores pueden actualizar personal
router.put('/:id', authenticate, authorize(['administrator']), staffController.updateUserInfo);

// --- Rutas de actividad y preferencias (cualquier usuario autenticado) ---

// GET /my-activity: Obtener la actividad reciente del usuario actual
router.get('/my-activity', authenticate, staffController.getMyActivity);

// GET /my-preferences: Obtener las preferencias del usuario actual
router.get('/my-preferences', authenticate, staffController.getMyPreferences);

// PUT /my-preferences: Actualizar las preferencias del usuario actual
router.put('/my-preferences', authenticate, staffController.updateMyPreferences);

module.exports = router;