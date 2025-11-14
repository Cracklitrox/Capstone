const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const { authenticate } = require("../../middleware/auth.middleware");
const {
  getAllReservations,
  getReservationById,
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
  getReservationPayments,
  registerPayment,
  rejectPayment,
  annulPayment,
  retryPayment,
  requestAnnulment
} = require("./payments.controller");

const {
  addManualCharge,
  getManualCharges,
  removeManualCharge
} = require("./charges.controller");

const {
  checkExtensionAvailability,
  extendStay
} = require("./extension.controller");

const {
  getAvailableUpgrades,
  upgradeRoom,
  changeRoom
} = require("./rooms-modification.controller");

const {
  earlyCheckout,
  lateCheckout
} = require("./checkout-modifications.controller");

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

// Obtener todas las reservas (con filtros opcionales)
// IMPORTANTE: Esta ruta debe ir DESPUÉS de las rutas específicas
router.get("/", authenticate, getAllReservations);

// Crear reserva
router.post("/", authenticate, createReservation);

// Obtener servicios disponibles
router.get("/services", authenticate, getAvailableServices);

// Obtener menú de desayunos
router.get("/breakfast-menu", authenticate, getBreakfastMenu);

// Obtener una reserva por ID
router.get("/:id", authenticate, getReservationById);

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
router.get("/:id/payments", authenticate, getReservationPayments);

// Registrar un nuevo pago
router.post("/:id/payments", authenticate, registerPayment);

// Confirmar un pago
router.post("/payments/:paymentId/confirm", authenticate, confirmPayment);

// Rechazar un pago pendiente
router.post("/payments/:paymentId/reject", authenticate, rejectPayment);

// Anular un pago confirmado (solo admin)
router.post("/payments/:paymentId/annul", authenticate, annulPayment);

// Reintentar un pago fallido
router.post("/payments/:paymentId/retry", authenticate, retryPayment);

// Solicitar anulación de pago (recepcionistas)
router.post("/payments/:paymentId/request-annulment", authenticate, requestAnnulment);

// ============================================
// CARGOS MANUALES
// ============================================

// Agregar cargo manual
router.post("/:id/charges", authenticate, addManualCharge);

// Obtener cargos manuales de una reserva
router.get("/:id/charges", authenticate, getManualCharges);

// Eliminar cargo manual
router.delete("/:id/charges/:chargeId", authenticate, removeManualCharge);

// ============================================
// EXTENSIÓN DE ESTADÍA
// ============================================

// Verificar disponibilidad para extensión
router.post("/:id/check-availability-extension", authenticate, checkExtensionAvailability);

// Extender estadía
router.post("/:id/extend", authenticate, extendStay);

// ============================================
// MODIFICACIONES DE HABITACIONES
// ============================================

// Realizar upgrade de habitación
router.post("/:id/upgrade-room", authenticate, upgradeRoom);

// Cambiar habitación (misma categoría)
router.post("/:id/change-room", authenticate, changeRoom);

// ============================================
// MODIFICACIONES DE CHECKOUT
// ============================================

// Early checkout (salida anticipada)
router.post("/:id/early-checkout", authenticate, earlyCheckout);

// Late checkout (salida tardía)
router.post("/:id/late-checkout", authenticate, lateCheckout);

module.exports = router;
