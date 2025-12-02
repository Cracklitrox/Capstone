import express from 'express';
import * as staffController from './staff.controller.js';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';

import RateLimit from 'express-rate-limit';
const router = express.Router();

const limiter = RateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(limiter);


// --- Rutas de actividad y preferencias (cualquier usuario autenticado) ---
router.get('/my-activity', authenticate, staffController.getMyActivity);
router.get('/my-preferences', authenticate, staffController.getMyPreferences);
router.put('/my-preferences', authenticate, staffController.updateMyPreferences);

// --- Rutas de gestión de usuarios (solo administradores) ---
router.post('/', authenticate, authorize(['administrator']), staffController.createNewUser);
router.get('/', authenticate, authorize(['administrator']), staffController.listAllUsers);
router.get('/:id', authenticate, authorize(['administrator']), staffController.getUserDetails);
router.put('/:id', authenticate, authorize(['administrator']), staffController.updateUserInfo);

export default router;
