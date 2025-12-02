import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middleware/auth.middleware.js';
import reservationsController from './reservations.controller.js';
import paymentsController from './payments.controller.js';
import chargesController from './charges.controller.js';
import extensionController from './extension.controller.js';
import roomsModificationController from './rooms-modification.controller.js';
import checkoutModificationsController from './checkout-modifications.controller.js';

const router = express.Router();

// Rate limiter for reservation-related endpoints
const reservationsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
});

// Apply rate limiter to all routes in this router
router.use(reservationsLimiter);

// Buscar disponibilidad
router.get("/search-availability", authenticate, reservationsController.searchAvailability);

// Calcular precio
router.post("/calculate-price", authenticate, reservationsController.calculatePrice);

// Check-ins de hoy (debe ir ANTES de la ruta genérica "/")
router.get("/checkins-today", authenticate, reservationsController.getCheckinsToday);

// Check-outs de hoy (debe ir ANTES de la ruta genérica "/")
router.get("/checkouts-today", authenticate, reservationsController.getCheckoutsToday);

// Obtener todas las reservas (con filtros opcionales)
// IMPORTANTE: Esta ruta debe ir DESPUÉS de las rutas específicas
router.get("/", authenticate, reservationsController.getAllReservations);

// Crear reserva
router.post("/", authenticate, reservationsController.createReservation);

// Obtener servicios disponibles
router.get("/services", authenticate, reservationsController.getAvailableServices);

// Obtener menú de desayunos
router.get("/breakfast-menu", authenticate, reservationsController.getBreakfastMenu);

// Obtener una reserva por ID
router.get("/:id", authenticate, reservationsController.getReservationById);

// ============================================
// GESTIÓN DE ESTADOS DE RESERVAS
// ============================================

// Cambiar estado general
router.post("/:id/status", authenticate, reservationsController.changeStatus);

// Check-in
router.post("/:id/check-in", authenticate, reservationsController.checkIn);

// Check-out
router.post("/:id/check-out", authenticate, reservationsController.checkOut);

// Obtener historial de cambios
router.get("/:id/history", authenticate, reservationsController.getHistory);

// Obtener transiciones válidas
router.get("/:id/valid-transitions", authenticate, reservationsController.getValidTransitions);

// ============================================
// GESTIÓN DE PAGOS
// ============================================

// Obtener pagos de una reserva
router.get("/:id/payments", authenticate, paymentsController.getReservationPayments);

// Registrar un nuevo pago
router.post("/:id/payments", authenticate, paymentsController.registerPayment);

// Confirmar un pago
router.post("/payments/:paymentId/confirm", authenticate, paymentsController.confirmPayment);

// Rechazar un pago pendiente
router.post("/payments/:paymentId/reject", authenticate, paymentsController.rejectPayment);

// Anular un pago confirmado (solo admin)
router.post("/payments/:paymentId/annul", authenticate, paymentsController.annulPayment);

// Reintentar un pago fallido
router.post("/payments/:paymentId/retry", authenticate, paymentsController.retryPayment);

// Solicitar anulación de pago (recepcionistas)
router.post("/payments/:paymentId/request-annulment", authenticate, paymentsController.requestAnnulment);

// ============================================
// CARGOS MANUALES
// ============================================

// Agregar cargo manual
router.post("/:id/charges", authenticate, chargesController.addManualCharge);

// Obtener cargos manuales de una reserva
router.get("/:id/charges", authenticate, chargesController.getManualCharges);

// Eliminar cargo manual
router.delete("/:id/charges/:chargeId", authenticate, chargesController.removeManualCharge);

// ============================================
// EXTENSIÓN DE ESTADÍA
// ============================================

// Verificar disponibilidad para extensión
router.post("/:id/check-availability-extension", authenticate, extensionController.checkExtensionAvailability);

// Extender estadía
router.post("/:id/extend", authenticate, extensionController.extendStay);

// ============================================
// MODIFICACIONES DE HABITACIONES
// ============================================

// Realizar upgrade de habitación
router.post("/:id/upgrade-room", authenticate, roomsModificationController.upgradeRoom);

// Cambiar habitación (misma categoría)
router.post("/:id/change-room", authenticate, roomsModificationController.changeRoom);

// ============================================
// MODIFICACIONES DE CHECKOUT
// ============================================

// Early checkout (salida anticipada)
router.post("/:id/early-checkout", authenticate, checkoutModificationsController.earlyCheckout);

// Late checkout (salida tardía)
router.post("/:id/late-checkout", authenticate, checkoutModificationsController.lateCheckout);

export default router;
