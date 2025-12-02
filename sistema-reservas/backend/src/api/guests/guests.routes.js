import express from "express";
const router = express.Router();
import rateLimit from "express-rate-limit";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  searchGuest,
  createGuest,
  updateGuest,
  getAllGuests,
  getGuestProfile,
  getGuestReservations,
  updateGuestObservations,
  updateGuestProfile,
  deleteGuest,
} from "./guests.controller.js";

// Define rate limiters
const guestUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Aumentado de 10 a 50 para permitir pruebas con múltiples colecciones
  message: "Too many update requests from this IP, please try again later.",
});

const guestSearchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: "Too many search requests from this IP, please try again later.",
});

const guestCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Aumentado de 10 a 50 para permitir pruebas con múltiples colecciones
  message: "Too many create requests from this IP, please try again later.",
});

// ✅ NUEVAS RUTAS - Deben ir ANTES de las rutas con parámetros
// Obtener todos los huéspedes (búsqueda principal)
router.get("/", authenticate, guestSearchLimiter, getAllGuests);

// Buscar huésped por identificación
router.get(
  "/search/:identificationNumber",
  guestSearchLimiter,
  authenticate,
  searchGuest
);

// ✅ RUTAS CON ID - Van después
// Obtener perfil completo de huésped
router.get("/:id/profile", authenticate, getGuestProfile);

// Obtener historial de reservas de huésped
router.get("/:id/reservations", authenticate, getGuestReservations);

// Actualizar observaciones de huésped
router.put(
  "/:id/observations",
  authenticate,
  guestUpdateLimiter,
  updateGuestObservations
);

// Actualizar perfil de huésped
router.put(
  "/:id/profile",
  authenticate,
  guestUpdateLimiter,
  updateGuestProfile
);

// Crear nuevo huésped
router.post("/", authenticate, guestCreateLimiter, createGuest);

// Actualizar huésped
router.put("/:id", authenticate, guestUpdateLimiter, updateGuest);

// Eliminar huésped
router.delete("/:id", authenticate, deleteGuest);

export default router;
