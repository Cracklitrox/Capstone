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
 * @route GET /api/v1/notifications/checkout-count
 */
async function getCheckoutAlertsCount(req, res, next) {
  try {
    const count = await notificationsService.getCheckoutAlertsCount();
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

module.exports = {
  getCheckoutAlerts,
  getCheckoutAlertsCount,
  getPastCheckouts,
  getFutureCheckouts,
};
