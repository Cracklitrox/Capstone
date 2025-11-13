const notificationsService = require('./notifications.service');

/**
 * Controlador para obtener las alertas de check-out del día actual
 * @route GET /api/v1/notifications/checkout-alerts
 */
async function getCheckoutAlerts(req, res, next) {
  try {
    const alerts = await notificationsService.getCheckoutAlertsForToday();
    const chileTime = notificationsService.getChileTime();

    res.json({
      success: true,
      count: alerts.length,
      currentTime: chileTime,
      data: alerts,
      message: alerts.length > 0 
        ? `Se encontraron ${alerts.length} habitación(es) con check-out programado para hoy.`
        : 'No hay check-outs programados para hoy.',
    });
  } catch (error) {
    console.error('Error al obtener alertas de check-out:', error);
    next(error);
  }
}

/**
 * Controlador para obtener solo el conteo de alertas de check-out
 * Considera si el usuario autenticado ya vio las alertas de hoy
 * @route GET /api/v1/notifications/checkout-count
 */
async function getCheckoutAlertsCount(req, res, next) {
  try {
    // Obtener userId del token JWT (agregado por middleware de autenticación)
    const userId = req.user?.id;

    const count = await notificationsService.getCheckoutAlertsCount(userId);
    const chileTime = notificationsService.getChileTime();

    res.json({
      success: true,
      count,
      currentTime: chileTime,
      message: count > 0
        ? `${count} check-out(s) pendiente(s) para hoy.`
        : 'No hay check-outs pendientes para hoy.',
    });
  } catch (error) {
    console.error('Error al obtener conteo de alertas:', error);
    next(error);
  }
}

/**
 * Controlador para marcar las alertas de checkout de hoy como vistas
 * @route POST /api/v1/notifications/checkout-alerts/mark-viewed
 */
async function markCheckoutAlertsAsViewed(req, res, next) {
  try {
    // Obtener userId del token JWT
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
    }

    const result = await notificationsService.markCheckoutAlertsAsViewed(userId);

    res.json({
      success: true,
      message: 'Alertas de checkout marcadas como vistas',
      data: result,
    });
  } catch (error) {
    console.error('Error al marcar checkout alerts como vistos:', error);
    next(error);
  }
}

/**
 * Controlador para verificar si el usuario ya vio los checkouts de hoy
 * @route GET /api/v1/notifications/checkout-alerts/has-viewed
 */
async function hasViewedCheckoutsToday(req, res, next) {
  try {
    // Obtener userId del token JWT
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
    }

    const hasViewed = await notificationsService.hasUserViewedCheckoutsToday(userId);

    res.json({
      success: true,
      hasViewed,
    });
  } catch (error) {
    console.error('Error al verificar visualización de checkouts:', error);
    next(error);
  }
}

/**
 * Controlador para obtener check-outs pasados
 * @route GET /api/v1/notifications/past-checkouts?days=7
 */
async function getPastCheckouts(req, res, next) {
  try {
    const daysBack = parseInt(req.query.days) || 7;
    const checkouts = await notificationsService.getPastCheckouts(daysBack);
    const chileTime = notificationsService.getChileTime();

    res.json({
      success: true,
      count: checkouts.length,
      daysBack,
      currentTime: chileTime,
      data: checkouts,
      message: checkouts.length > 0
        ? `Se encontraron ${checkouts.length} check-out(s) en los últimos ${daysBack} días.`
        : `No hay check-outs en los últimos ${daysBack} días.`,
    });
  } catch (error) {
    console.error('Error al obtener check-outs pasados:', error);
    next(error);
  }
}

/**
 * Controlador para obtener check-outs futuros
 * @route GET /api/v1/notifications/future-checkouts?days=7
 */
async function getFutureCheckouts(req, res, next) {
  try {
    const daysAhead = parseInt(req.query.days) || 7;
    const checkouts = await notificationsService.getFutureCheckouts(daysAhead);
    const chileTime = notificationsService.getChileTime();

    res.json({
      success: true,
      count: checkouts.length,
      daysAhead,
      currentTime: chileTime,
      data: checkouts,
      message: checkouts.length > 0
        ? `Se encontraron ${checkouts.length} check-out(s) en los próximos ${daysAhead} días.`
        : `No hay check-outs programados en los próximos ${daysAhead} días.`,
    });
  } catch (error) {
    console.error('Error al obtener check-outs futuros:', error);
    next(error);
  }
}

/**
 * Controlador para eliminar una alerta de checkout (soft delete)
 * @route DELETE /api/v1/notifications/checkout-alerts/:id
 */
async function deleteCheckoutAlert(req, res, next) {
  try {
    const alertId = parseInt(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
    }

    const result = await notificationsService.deleteCheckoutAlert(alertId, userId);

    res.json({
      success: true,
      message: 'Alerta de checkout eliminada',
      data: result,
    });
  } catch (error) {
    console.error('Error al eliminar alerta de checkout:', error);
    next(error);
  }
}

module.exports = {
  getCheckoutAlerts,
  getCheckoutAlertsCount,
  markCheckoutAlertsAsViewed,
  hasViewedCheckoutsToday,
  getPastCheckouts,
  getFutureCheckouts,
  deleteCheckoutAlert,
};
