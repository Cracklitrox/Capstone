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
} = require("./reservations.controller");

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

module.exports = router;
