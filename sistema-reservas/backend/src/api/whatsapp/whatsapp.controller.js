const prisma = require('../../db/prisma.client');

/**
 * Obtener alertas de reservas de WhatsApp con sus summaries completos
 * Query params:
 *   - onlyUnviewed: 'true' | 'false' (default: 'false')
 *   Si es 'true', solo devuelve alertas no vistas (last_viewed_at IS NULL)
 *   Si es 'false', devuelve todas las alertas pendientes
 */
async function getWhatsAppBookingAlerts(req, res) {
  try {
    const { onlyUnviewed = 'false' } = req.query;
    
    // Construir el filtro WHERE
    const whereClause = {
      type: 'booking_request',
      status: 'pending',
    };
    
    // Si solo queremos no vistas, agregar filtro
    if (onlyUnviewed === 'true') {
      whereClause.last_viewed_at = null;
    }
    
    const alerts = await prisma.alerts.findMany({
      where: whereClause,
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

/**
 * Marcar todas las alertas de WhatsApp pendientes como vistas
 */
async function markWhatsAppAlertsAsViewed(req, res) {
  try {
    const result = await prisma.alerts.updateMany({
      where: {
        type: 'booking_request',
        status: 'pending',
        last_viewed_at: null,
      },
      data: {
        last_viewed_at: new Date(),
      },
    });

    console.log(`✅ ${result.count} alertas de WhatsApp marcadas como vistas`);

    res.json({
      success: true,
      message: `${result.count} alertas marcadas como vistas`,
      count: result.count,
    });
  } catch (error) {
    console.error('Error al marcar alertas como vistas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar alertas como vistas',
    });
  }
}

module.exports = {
  getWhatsAppBookingAlerts,
  markWhatsAppAlertsAsViewed,
};
