const express = require('express');
const router = express.Router();

// Importamos las rutas del módulo de personal desde su nueva ubicación
const staffRoutes = require('./staff/staff.routes');
const authRoutes = require('./auth/auth.routes');
const { verifyToken } = require('../middleware/auth.middleware');

// Ruta de bienvenida para la API
router.get('/', (req, res) => {
  res.status(200).json({ message: 'Bienvenido a la API v1 del Hotel Don Teo' });
});

// Las rutas de autenticación son públicas (para poder iniciar sesión)
router.use('/auth', authRoutes);

// Todas las rutas definidas en 'staffRoutes' ahora pasarán primero por 'verifyToken'.
router.use('/staff', verifyToken, staffRoutes);

module.exports = router;