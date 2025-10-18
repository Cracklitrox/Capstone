const express = require("express");
const router = express.Router();

// Import express-rate-limit for rate limiting
const rateLimit = require("express-rate-limit");

const staffRoutes = require("./staff/staff.routes");
const authRoutes = require("./auth/auth.routes");
const reservationHistoryRoutes = require('./reservation_history/reservation_history.routes'); 
const roomsRoutes = require("./rooms/rooms.routes");
const adminRoomsRoutes = require('./rooms/admin/adminRooms.routes');
const planningRoutes = require("./planning/planning.routes");
const guestsRoutes = require("./guests/guests.routes");
const reservationsRoutes = require("./reservations/reservations.routes");
const systemRoutes = require("./system/system.routes");
const notificationsRoutes = require('./notifications/notifications.routes');
const reportsRoutes = require('./reports/reports.routes');

const { authenticate } = require("../middleware/auth.middleware");

// ⭐ Rate limiter mejorado: por usuario autenticado, no por IP
const cummonLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
  
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
router.use("/reports", authenticate, cummonLimiter, reportsRoutes);

module.exports = router;