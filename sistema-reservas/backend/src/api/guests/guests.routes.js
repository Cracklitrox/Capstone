const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { authenticate } = require("../../middleware/auth.middleware");
const {
  searchGuest,
  createGuest,
  updateGuest,
} = require("./guests.controller");

// Define rate limiter for guest update route
const guestUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per 15 minutes
  message: "Too many update requests from this IP, please try again later."
});

// Buscar huésped por identificación
router.get("/search/:identificationNumber", authenticate, searchGuest);

// Crear nuevo huésped
router.post("/", authenticate, createGuest);

// Actualizar huésped
router.put("/:id", authenticate, guestUpdateLimiter, updateGuest);

module.exports = router;