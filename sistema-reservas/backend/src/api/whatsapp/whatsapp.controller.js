const prisma = require('../../db/prisma.client');
const whatsappService = require('../../whatsapp/whatsapp.service');

/**
 * Obtener alertas de reservas de WhatsApp con sus summaries completos
 * Query params:
 *   - onlyUnviewed: 'true' | 'false' (default: 'false')
 *   Si es 'true', solo devuelve alertas no vistas (last_viewed_at IS NULL) y pendientes
 *   Si es 'false', devuelve todas las alertas (pendientes, confirmadas, rechazadas)
 */
async function getWhatsAppBookingAlerts(req, res) {
  try {
    const { onlyUnviewed = 'false' } = req.query;
    
    // Construir el filtro WHERE
    const whereClause = {
      type: 'booking_request',
    };
    
    // Si solo queremos no vistas, filtrar por pending y last_viewed_at null
    if (onlyUnviewed === 'true') {
      whereClause.status = 'pending';
      whereClause.last_viewed_at = null;
    }
    // Si no, traer todas las alertas (pending, resolved, ignored)
    
    const alerts = await prisma.alerts.findMany({
      where: whereClause,
      orderBy: {
        created_at: 'desc',
      },
      take: 100, // Aumentar límite para incluir todas las alertas
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

/**
 * Rechazar una solicitud de reserva de WhatsApp
 * - Cambia el status a 'ignored'
 * - Envía mensaje de rechazo al cliente por WhatsApp
 */
async function rejectWhatsAppBookingAlert(req, res) {
  try {
    const { alertId } = req.params;
    const { reason } = req.body; // Razón opcional del rechazo

    // Buscar la alerta
    const alert = await prisma.alerts.findUnique({
      where: { id: parseInt(alertId) },
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alerta no encontrada',
      });
    }

    if (alert.type !== 'booking_request') {
      return res.status(400).json({
        success: false,
        message: 'Esta alerta no es una solicitud de reserva',
      });
    }

    // Obtener información del cliente desde full_summary
    const fullSummary = alert.full_summary;
    if (!fullSummary || !fullSummary.guest_principal) {
      return res.status(400).json({
        success: false,
        message: 'No se encontró información del cliente en la alerta',
      });
    }

    const clientPhone = fullSummary.guest_principal.phone;
    const clientName = fullSummary.guest_principal.name || 'Cliente';

    // Formatear número de teléfono para WhatsApp
    // Si el número ya tiene @s.whatsapp.net, dejarlo como está
    // Si no, agregarlo
    const formattedPhone = clientPhone.includes('@s.whatsapp.net')
      ? clientPhone
      : `${clientPhone}@s.whatsapp.net`;

    // Actualizar el status de la alerta a 'ignored'
    await prisma.alerts.update({
      where: { id: parseInt(alertId) },
      data: {
        status: 'ignored',
      },
    });

    // Construir mensaje de rechazo
    const rejectionMessage = `Estimado/a ${clientName},\n\n` +
      `Lamentamos informarle que su solicitud de reserva ha sido rechazada.\n` +
      (reason ? `\nMotivo: ${reason}\n` : '') +
      `\nPara más información, puede contactarnos directamente.\n\n` +
      `Gracias por su comprensión.\n` +
      `Hotel Don Teo`;

    // Enviar mensaje de rechazo por WhatsApp
    try {
      await whatsappService.sendMessage(formattedPhone, rejectionMessage);
      console.log(`✅ Mensaje de rechazo enviado a ${formattedPhone}`);
    } catch (whatsappError) {
      console.error('Error al enviar mensaje de WhatsApp:', whatsappError);
      // No fallar la petición si el mensaje no se envía
      // La alerta ya fue rechazada en la BD
    }

    res.json({
      success: true,
      message: 'Solicitud rechazada correctamente',
      data: {
        alertId: parseInt(alertId),
        status: 'ignored',
        notificationSent: true,
      },
    });
  } catch (error) {
    console.error('Error al rechazar solicitud:', error);
    res.status(500).json({
      success: false,
      message: 'Error al rechazar la solicitud',
    });
  }
}

/**
 * Confirmar una solicitud de reserva de WhatsApp
 * - Cambia el status a 'resolved'
 * - Envía mensaje de confirmación al cliente por WhatsApp
 */
async function confirmWhatsAppBookingAlert(req, res) {
  try {
    const { alertId } = req.params;

    // Buscar la alerta
    const alert = await prisma.alerts.findUnique({
      where: { id: parseInt(alertId) },
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alerta no encontrada',
      });
    }

    if (alert.type !== 'booking_request') {
      return res.status(400).json({
        success: false,
        message: 'Esta alerta no es una solicitud de reserva',
      });
    }

    // Obtener información del cliente desde full_summary
    const fullSummary = alert.full_summary;
    if (!fullSummary || !fullSummary.guest_principal) {
      return res.status(400).json({
        success: false,
        message: 'No se encontró información del cliente en la alerta',
      });
    }

    const clientPhone = fullSummary.guest_principal.phone;
    const clientName = fullSummary.guest_principal.name || 'Cliente';
    const reservation = fullSummary.reservation;

    // Formatear número de teléfono para WhatsApp
    const formattedPhone = clientPhone.includes('@s.whatsapp.net')
      ? clientPhone
      : `${clientPhone}@s.whatsapp.net`;

    // Actualizar el status de la alerta a 'resolved'
    await prisma.alerts.update({
      where: { id: parseInt(alertId) },
      data: {
        status: 'resolved',
      },
    });

    // Construir mensaje de confirmación
    const confirmationMessage = `¡Estimado/a ${clientName}!\n\n` +
      `Nos complace informarle que su solicitud de reserva ha sido CONFIRMADA ✅\n\n` +
      `📋 Detalles de su reserva:\n` +
      `🏨 Habitación: ${reservation.room_type_name}\n` +
      `📅 Check-in: ${reservation.check_in}\n` +
      `📅 Check-out: ${reservation.check_out}\n` +
      `🛏️ ${reservation.nights} noche${reservation.nights !== 1 ? 's' : ''}\n` +
      `👥 ${reservation.total_guests} huésped${reservation.total_guests !== 1 ? 'es' : ''}\n\n` +
      `Esperamos recibirle pronto en Hotel Don Teo.\n\n` +
      `Para cualquier consulta, estamos a su disposición.\n\n` +
      `¡Gracias por su preferencia!`;

    // Enviar mensaje de confirmación por WhatsApp
    try {
      await whatsappService.sendMessage(formattedPhone, confirmationMessage);
      console.log(`✅ Mensaje de confirmación enviado a ${formattedPhone}`);
    } catch (whatsappError) {
      console.error('Error al enviar mensaje de WhatsApp:', whatsappError);
      // No fallar la petición si el mensaje no se envía
      // La alerta ya fue confirmada en la BD
    }

    res.json({
      success: true,
      message: 'Solicitud confirmada correctamente',
      data: {
        alertId: parseInt(alertId),
        status: 'resolved',
        notificationSent: true,
      },
    });
  } catch (error) {
    console.error('Error al confirmar solicitud:', error);
    res.status(500).json({
      success: false,
      message: 'Error al confirmar la solicitud',
    });
  }
}

module.exports = {
  getWhatsAppBookingAlerts,
  markWhatsAppAlertsAsViewed,
  rejectWhatsAppBookingAlert,
  confirmWhatsAppBookingAlert,
};
