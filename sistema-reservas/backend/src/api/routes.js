const express = require('express');
const router = express.Router();

const staffRoutes = require('./staff/staff.routes');
const authRoutes = require('./auth/auth.routes');

const authenticate = require('../middleware/auth.middleware');

router.get('/', (req, res) => {
  res.status(200).json({ message: 'Bienvenido a la API v1 del Hotel Don Teo' });
});

router.use('/auth', authRoutes);

router.use('/staff', authenticate, staffRoutes);

module.exports = router;