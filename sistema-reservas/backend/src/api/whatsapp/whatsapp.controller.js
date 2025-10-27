const prisma = require('../../db/prisma.client');

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

    // Devolver las alertas con el fullSummary del campo JSON de la BD
    const alertsWithSummary = alerts.map(alert => ({
      id: alert.id,
      type: alert.type,
      status: alert.status,
      createdAt: alert.created_at,
      shortDetail: alert.detail,
      fullSummary: alert.full_summary || null,
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
};
