const express = require('express');
const staffController = require('./staff.controller');
const authenticate = require('../../middleware/auth.middleware');
const authorize = require('../../middleware/authorize.middleware');

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

// --- Definición de Rutas con Capas de Seguridad ---

// POST /: Crear un nuevo usuario del personal (ej. un recepcionista)
// 1. `authenticate`: Verifica que el token es válido y el usuario existe.
// 2. `authorize(['administrator'])`: Verifica que el usuario tenga el rol de administrador.
router.post('/', authenticate, authorize(['administrator']), staffController.createNewUser);

// GET /: Listar todos los usuarios del personal
// 1. `authenticate`: Verifica que el token es válido.
// 2. `authorize(...)`: Verifica que el usuario sea administrador O recepcionista.
router.get('/', authenticate, authorize(['administrator', 'receptionist']), staffController.listAllUsers);

// GET /:id: Ver el detalle de un usuario específico
// Mismas reglas que para listar a todos.
router.get('/:id', authenticate, authorize(['administrator', 'receptionist']), staffController.getUserDetails);

// PUT /:id: Actualizar la información de un usuario
// Por seguridad, solo los administradores pueden modificar datos del personal.
router.put('/:id', authenticate, authorize(['administrator']), staffController.updateUserInfo);

// Un apunte sobre la ruta para Eliminar:
// Cuando la crees, seguirá este mismo patrón. Por ejemplo:
// router.delete('/:id', authenticate, authorize(['administrator']), staffController.deleteUser);

module.exports = router;