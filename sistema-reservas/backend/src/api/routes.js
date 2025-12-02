import express from "express";
const router = express.Router();

// Import express-rate-limit for rate limiting
import rateLimit from "express-rate-limit";

import staffRoutes from "./staff/staff.routes.js";
import authRoutes from "./auth/auth.routes.js";
import reservationHistoryRoutes from './reservation_history/reservation_history.routes.js';
import roomsRoutes from "./rooms/rooms.routes.js";
import adminRoomsRoutes from './rooms/admin/adminRooms.routes.js';
import planningRoutes from "./planning/planning.routes.js";
import guestsRoutes from "./guests/guests.routes.js";
import reservationsRoutes from "./reservations/reservations.routes.js";
import systemRoutes from "./system/system.routes.js";
import notificationsRoutes from './notifications/notifications.routes.js';
import whatsappRoutes from './booking-alerts/whatsapp.routes.js';
import reportsRoutes from './reports/reports.routes.js';

import { authenticate } from "../middleware/auth.middleware.js";

// ⭐ Rate limiter mejorado: por usuario autenticado, no por IP
const cummonLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
  skipSuccessfulRequests: false,

  // ⭐ Usar ID de usuario si está autenticado, sino dejar que express-rate-limit maneje la IP
  keyGenerator: (req, res) => {
    if (req.user && req.user.id) {
      return `user_${req.user.id}`;
    }
    // Retornar undefined permite que express-rate-limit use su lógica por defecto para IPs
    return undefined;
  },

  handler: (req, res) => {
    res.status(429).json({
      message: 'Demasiadas peticiones. Por favor, espera un momento e intenta de nuevo.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

router.get("/", (req, res) => {
  res.status(200).json({ message: "Bienvenido a la API v1 del Hotel Don Teo" });
});

// ⚠️ /auth NO lleva authenticate, solo cummonLimiter directo
router.use("/auth", authRoutes);

// ⭐ Todas las demás rutas: authenticate PRIMERO, luego cummonLimiter
router.use("/rooms", authenticate, cummonLimiter, roomsRoutes);
router.use('/reservation_history', authenticate, cummonLimiter, reservationHistoryRoutes);
router.use('/admin/rooms', authenticate, cummonLimiter, adminRoomsRoutes);
router.use("/staff", authenticate, cummonLimiter, staffRoutes);
router.use("/planning", authenticate, cummonLimiter, planningRoutes);
router.use('/notifications', authenticate, cummonLimiter, notificationsRoutes);
router.use("/guests", authenticate, cummonLimiter, guestsRoutes);
router.use("/reservations", authenticate, cummonLimiter, reservationsRoutes);
router.use("/system", authenticate, cummonLimiter, systemRoutes);
router.use("/whatsapp", authenticate, cummonLimiter, whatsappRoutes);
router.use("/reports", authenticate, cummonLimiter, reportsRoutes);

export default router;
