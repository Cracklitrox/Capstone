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

module.exports = {
  getCheckoutAlerts,
  getCheckoutAlertsCount,
};
