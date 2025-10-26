const prisma = require('../../db/prisma.client');

// Almacenamiento temporal en memoria para los fullSummary de las alertas
// TODO: Migrar esto a Redis o agregar un campo JSON en la tabla alerts
const alertSummaries = new Map();

/**
 * Guardar el fullSummary de una alerta
 */
function storeAlertSummary(alertId, fullSummary) {
  alertSummaries.set(alertId, fullSummary);
}

/**
 * Obtener alertas de reservas de WhatsApp con sus summaries completos
 */
async function getWhatsAppBookingAlerts(req, res) {
  try {
    const alerts = await prisma.alerts.findMany({
      where: {
        type: 'booking_request',
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 50, // Limitar a las últimas 50 alertas
    });

    // Agregar el fullSummary a cada alerta si está disponible
    const alertsWithSummary = alerts.map(alert => ({
      id: alert.id,
      type: alert.type,
      status: alert.status,
      createdAt: alert.created_at,
      shortDetail: alert.detail,
      fullSummary: alertSummaries.get(alert.id) || null,
    }));

    res.json({
      success: true,
      data: alertsWithSummary,
    });
  } catch (error) {
    console.error('Error al obtener alertas de WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener alertas de reservas de WhatsApp',
    });
  }
}

module.exports = {
  getWhatsAppBookingAlerts,
  storeAlertSummary,
};
