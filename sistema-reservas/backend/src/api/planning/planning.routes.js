import express from 'express';
const router = express.Router();
import planningController from './planning.controller.js';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';

// Protegida para que solo personal autorizado pueda verla.
router.get(
  '/tape-chart',
  authenticate,
  authorize(['administrator', 'receptionist']),
  planningController.getTapeChart
);

export default router;