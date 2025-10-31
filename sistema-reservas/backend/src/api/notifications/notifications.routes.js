const express = require("express");
const router = express.Router();
const notificationsController = require("./notifications.controller");
const realtimeController = require("./notifications.realtime.controller");
const { authenticate, authorize } = require("../../middleware/auth.middleware");
const rateLimit = require("express-rate-limit");

// Configure a rate limiter: 2000 requests per 15 minutes (per IP) - Aumentado significativamente para desarrollo
const notificationsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Limit each IP to 2000 requests per windowMs (aumentado para desarrollo con React Strict Mode)
  standardHeaders: true, // Send rate limit info in the RateLimit-* headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
  message: 'Demasiadas solicitudes desde esta IP, por favor intenta nuevamente en 15 minutos.'
});

// ==================== RUTAS DE NOTIFICACIONES EN TIEMPO REAL ====================

/**
 * @route POST /api/v1/notifications
 * @desc Crea una nueva notificación y la envía en tiempo real
 * @access Administrador y Recepcionista
 */
router.post(
  "/",
  notificationsLimiter,
  authenticate,
  authorize(["administrator", "receptionist"]),
  realtimeController.createNotification
);

/**
 * @route GET /api/v1/notifications
 * @desc Obtiene todas las notificaciones del usuario autenticado
 * @access Administrador y Recepcionista
 */
router.get(
  "/",
  notificationsLimiter,
  authenticate,
  authorize(["administrator", "receptionist"]),
  realtimeController.getUserNotifications
);

/**
 * @route GET /api/v1/notifications/unread-count
 * @desc Obtiene el conteo de notificaciones no leídas
 * @access Administrador y Recepcionista
 */
router.get(
  "/unread-count",
  notificationsLimiter,
  authenticate,
  authorize(["administrator", "receptionist"]),
  realtimeController.getUnreadCount
);

/**
 * @route PUT /api/v1/notifications/mark-all-read
 * @desc Marca todas las notificaciones como leídas
 * @access Administrador y Recepcionista
 */
router.put(
  "/mark-all-read",
  notificationsLimiter,
  authenticate,
  authorize(["administrator", "receptionist"]),
  realtimeController.markAllAsRead
);

/**
 * @route GET /api/v1/notifications/users-by-role/:roleId
 * @desc Obtiene usuarios activos por rol (excluyendo al usuario actual)
 * @access Administrador y Recepcionista
 */
router.get(
  "/users-by-role/:roleId",
  notificationsLimiter,
  authenticate,
  authorize(["administrator", "receptionist"]),
  realtimeController.getUsersByRole
);

/**
 * @route GET /api/v1/notifications/:id/read-stats
 * @desc Obtiene estadísticas de lectura de una notificación
 * @access Administrador y Recepcionista
 */
router.get(
  "/:id/read-stats",
  notificationsLimiter,
  authenticate,
  authorize(["administrator", "receptionist"]),
  realtimeController.getNotificationReadStats
);

/**
 * @route PUT /api/v1/notifications/:id/read
 * @desc Marca una notificación como leída
 * @access Administrador y Recepcionista
 */
router.put(
  "/:id/read",
  notificationsLimiter,
  authenticate,
  authorize(["administrator", "receptionist"]),
  realtimeController.markAsRead
);

/**
 * @route PUT /api/v1/notifications/:id/archive
 * @desc Marca una notificación como archivada
 * @access Administrador y Recepcionista
 */
router.put(
  "/:id/archive",
  notificationsLimiter,
  authenticate,
  authorize(["administrator", "receptionist"]),
  realtimeController.markAsArchived
);

/**
 * @route PUT /api/v1/notifications/:id/unarchive
 * @desc Desmarca una notificación archivada
 * @access Administrador y Recepcionista
 */
router.put(
  "/:id/unarchive",
  notificationsLimiter,
  authenticate,
  authorize(["administrator", "receptionist"]),
  realtimeController.unarchiveNotification
);

/**
 * @route DELETE /api/v1/notifications/:id
 * @desc Elimina una notificación
 * @access Administrador y Recepcionista
 */
router.delete(
  "/:id",
  notificationsLimiter,
  authenticate,
  authorize(["administrator", "receptionist"]),
  realtimeController.deleteNotification
);

// ==================== RUTAS DE ALERTAS DE CHECK-OUT ====================

/**
 * @route GET /api/v1/notifications/checkout-alerts
 * @desc Obtiene todas las alertas de check-out para el día actual (zona horaria Chile)
 * @access Solo Recepcionista
 */
router.get(
  "/checkout-alerts",
  notificationsLimiter,
  authenticate,
  authorize(["receptionist"]),
  notificationsController.getCheckoutAlerts
);

/**
 * @route GET /api/v1/notifications/checkout-count
 * @desc Obtiene el conteo de alertas de check-out para mostrar en badge
 * @access Recepcionista y Administrador
 */
router.get(
  "/checkout-count",
  notificationsLimiter,
  authenticate,
  authorize(["receptionist", "administrator"]),
  notificationsController.getCheckoutAlertsCount
);

/**
 * @route GET /api/v1/notifications/past-checkouts
 * @desc Obtiene check-outs de días pasados
 * @query days - Número de días hacia atrás (default: 7)
 * @access Recepcionista y Administrador
 */
router.get(
  "/past-checkouts",
  notificationsLimiter,
  authenticate,
  authorize(["receptionist", "administrator"]),
  notificationsController.getPastCheckouts
);

/**
 * @route GET /api/v1/notifications/future-checkouts
 * @desc Obtiene check-outs de días futuros
 * @query days - Número de días hacia adelante (default: 7)
 * @access Recepcionista y Administrador
 */
router.get(
  "/future-checkouts",
  notificationsLimiter,
  authenticate,
  authorize(["receptionist", "administrator"]),
  notificationsController.getFutureCheckouts
);

module.exports = router;
