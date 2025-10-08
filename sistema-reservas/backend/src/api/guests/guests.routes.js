const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { authenticate } = require("../../middleware/auth.middleware");
const {
  searchGuest,
  createGuest,
  updateGuest,
  getGuestProfile,
  getGuestReservations,
  searchAllGuests,
} = require("./guests.controller");

// Define rate limiter for guest update route
const guestUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per 15 minutes
  message: "Too many update requests from this IP, please try again later."
});

// Define rate limiter for guest search route
const guestSearchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 search requests per 15 minutes
  message: "Too many search requests from this IP, please try again later."
});

// Define rate limiter for guest creation route
const guestCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per 15 minutes
  message: "Too many create requests from this IP, please try again later."
});

// Buscar huésped por identificación
router.get("/search/:identificationNumber", guestSearchLimiter, authenticate, searchGuest);

// Obtener perfil completo de huésped
router.get("/:id/profile", authenticate, getGuestProfile);

// Obtener historial de reservas de huésped
router.get("/:id/reservations", authenticate, getGuestReservations);

// Buscar todos los huéspedes (para lista/búsqueda)
router.get("/", guestSearchLimiter, authenticate, searchAllGuests);

// Crear nuevo huésped
router.post("/", authenticate, guestCreateLimiter, createGuest);

// Actualizar huésped
router.put("/:id", authenticate, guestUpdateLimiter, updateGuest);

module.exports = router;