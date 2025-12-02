import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import systemController from './system.controller.js';
import schedulerController from './scheduler.controller.js';

const router = express.Router();

// Rate limiter for sensitive admin actions
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: "Too many requests, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Solo administradores pueden ver los logs
router.get("/errors", adminLimiter, authenticate, authorize(["admin"]), systemController.getErrors);

// Marcar error como resuelto
router.patch(
  "/errors/:id/resolve",
  adminLimiter,
  authenticate,
  authorize(["admin"]),
  systemController.markErrorAsResolved
);

// ==================== SCHEDULER ENDPOINTS ====================
// Obtener información de schedulers
router.get(
  "/scheduler/info",
  authenticate,
  authorize(["admin"]),
  schedulerController.getInfo
);

// Ejecutar job manualmente (para testing)
router.post(
  "/scheduler/trigger",
  adminLimiter,
  authenticate,
  authorize(["admin"]),
  schedulerController.triggerJob
);

export default router;
