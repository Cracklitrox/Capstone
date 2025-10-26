const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const { authenticate } = require("../../middleware/auth.middleware");
const {
  searchAvailability,
  calculatePrice,
  createReservation,
  getAvailableServices,
  getBreakfastMenu,
  changeStatus,
  checkIn,
  checkOut,
  getHistory,
  getValidTransitions
} = require("./reservations.controller");

const {
  confirmPayment,
  getReservationPayments
} = require("./payments.controller");

// Rate limiter for reservation-related endpoints
const reservationsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
});

// Apply rate limiter to all routes in this router
router.use(reservationsLimiter);

// Buscar disponibilidad
router.get("/search-availability", authenticate, searchAvailability);

// Calcular precio
router.post("/calculate-price", authenticate, calculatePrice);

// Crear reserva
router.post("/", authenticate, createReservation);

// Obtener servicios disponibles
router.get("/services", authenticate, getAvailableServices);

// Obtener menú de desayunos
router.get("/breakfast-menu", authenticate, getBreakfastMenu);

// ============================================
// GESTIÓN DE ESTADOS DE RESERVAS
// ============================================

// Cambiar estado general
router.post("/:id/status", authenticate, changeStatus);

// Check-in
router.post("/:id/check-in", authenticate, checkIn);

// Check-out
router.post("/:id/check-out", authenticate, checkOut);

// Obtener historial de cambios
router.get("/:id/history", authenticate, getHistory);

// Obtener transiciones válidas
router.get("/:id/valid-transitions", authenticate, getValidTransitions);

// ============================================
// GESTIÓN DE PAGOS
// ============================================

// Obtener pagos de una reserva
router.get("/:reservationId/payments", authenticate, getReservationPayments);

// Confirmar un pago
router.post("/payments/:paymentId/confirm", authenticate, confirmPayment);

module.exports = router;
