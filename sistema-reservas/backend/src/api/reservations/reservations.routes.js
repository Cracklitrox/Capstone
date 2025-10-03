const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/auth.middleware");
const {
  searchAvailability,
  calculatePrice,
  createReservation,
  getAvailableServices,
  getBreakfastMenu,
} = require("./reservations.controller");

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
