const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/auth.middleware");
const {
  searchGuest,
  createGuest,
  updateGuest,
} = require("./guests.controller");

// Buscar huésped por identificación
router.get("/search/:identificationNumber", authenticate, searchGuest);

// Crear nuevo huésped
router.post("/", authenticate, createGuest);

// Actualizar huésped
router.put("/:id", authenticate, updateGuest);

module.exports = router;