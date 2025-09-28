const express = require('express');
const router = express.Router();
const planningController = require('./planning.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

// Protegida para que solo personal autorizado pueda verla.
router.get(
  '/tape-chart',
  authenticate,
  authorize(['administrator', 'receptionist']),
  planningController.getTapeChart
);

module.exports = router;