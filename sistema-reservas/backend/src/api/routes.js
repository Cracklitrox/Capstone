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

// Define specific rate limiter for notifications routes
const cummonLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const { authenticate } = require("../middleware/auth.middleware");

router.get("/", (req, res) => {
  res.status(200).json({ message: "Bienvenido a la API v1 del Hotel Don Teo" });
});

router.use("/auth", authRoutes);
router.use("/rooms", authenticate, roomsRoutes);
router.use('/reservation_history', authenticate, reservationHistoryRoutes); 
router.use('/admin/rooms', adminRoomsRoutes);
router.use("/staff", cummonLimiter, authenticate, staffRoutes);
router.use("/planning", authenticate, planningRoutes);
router.use('/notifications', cummonLimiter, authenticate, notificationsRoutes);
router.use("/guests", authenticate, guestsRoutes);
router.use("/reservations", authenticate, reservationsRoutes);
router.use("/system", cummonLimiter, authenticate, systemRoutes);

module.exports = router;
