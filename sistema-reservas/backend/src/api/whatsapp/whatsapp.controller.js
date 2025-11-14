const prisma = require('../../db/prisma.client');
const whatsappService = require('../../whatsapp/whatsapp.service');

/**
 * Obtener alertas de reservas de WhatsApp con sus summaries completos
 * Query params:
 *   - onlyUnviewed: 'true' | 'false' (default: 'false')
 *   Si es 'true', solo devuelve alertas no vistas (last_viewed_at IS NULL) y pendientes
 *   Si es 'false', devuelve todas las alertas (pendientes, confirmadas, rechazadas)
 *   Filtra automáticamente las alertas eliminadas (soft delete) por el usuario actual
 */
async function getWhatsAppBookingAlerts(req, res) {
  try {
    const { onlyUnviewed = 'false' } = req.query;
    const userId = req.user.id; // Obtener userId del token JWT

    // Construir el filtro WHERE
    const whereClause = {
      type: 'booking_request',
      // Excluir alertas que el usuario ha eliminado (soft delete)
      alert_read_status: {
        none: {
          user_id: userId,
          deleted_at: {
            not: null,
          },
        },
      },
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
 * Obtener el conteo de alertas de WhatsApp pendientes para el usuario
 * Considera solo las alertas que no han sido eliminadas o resueltas/ignoradas
 */
async function getWhatsAppBookingAlertsCount(req, res) {
  try {
    const userId = req.user.id; // Obtener userId del token JWT

    // Contar alertas pendientes que no han sido eliminadas ni resueltas/ignoradas por este usuario
    const count = await prisma.alerts.count({
      where: {
        type: 'booking_request',
        status: 'pending',
        // No debe tener un registro en alert_read_status con status resolved/ignored o deleted_at no null
        alert_read_status: {
          none: {
            user_id: userId,
            OR: [
              {
                status: {
                  in: ['resolved', 'ignored'],
                },
              },
              {
                deleted_at: {
                  not: null,
                },
              },
            ],
          },
        },
      },
    });

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Error al obtener conteo de alertas de WhatsApp:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener conteo de alertas',
      count: 0,
    });
  }
}

/**
 * Marcar todas las alertas de WhatsApp pendientes como vistas
 */
async function markWhatsAppAlertsAsViewed(req, res) {
  try {
    const userId = req.user.id; // Obtener userId del token JWT

    // Obtener todas las alertas pendientes de booking_request
    const pendingAlerts = await prisma.alerts.findMany({
      where: {
        type: 'booking_request',
        status: 'pending',
      },
    });

    // Crear o actualizar alert_read_status para cada alerta
    const upsertPromises = pendingAlerts.map(alert =>
      prisma.alert_read_status.upsert({
        where: {
          alert_id_user_id: {
            alert_id: alert.id,
            user_id: userId,
          },
        },
        update: {
          status: 'pending',
          updated_at: new Date(),
        },
        create: {
          alert_id: alert.id,
          user_id: userId,
          status: 'pending',
        },
      })
    );

    await Promise.all(upsertPromises);

    // Actualizar last_viewed_at en la tabla alerts
    await prisma.alerts.updateMany({
      where: {
        type: 'booking_request',
        status: 'pending',
      },
      data: {
        last_viewed_at: new Date(),
      },
    });

    console.log(`✅ ${pendingAlerts.length} alertas de WhatsApp marcadas como vistas por usuario ${userId}`);

    res.json({
      success: true,
      message: `${pendingAlerts.length} alertas marcadas como vistas`,
      count: pendingAlerts.length,
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

    const userId = req.user.id; // Obtener userId del token JWT

    // Actualizar el status de la alerta a 'ignored'
    await prisma.alerts.update({
      where: { id: parseInt(alertId) },
      data: {
        status: 'ignored',
      },
    });

    // Actualizar o crear registro en alert_read_status
    await prisma.alert_read_status.upsert({
      where: {
        alert_id_user_id: {
          alert_id: parseInt(alertId),
          user_id: userId,
        },
      },
      update: {
        status: 'ignored',
        updated_at: new Date(),
      },
      create: {
        alert_id: parseInt(alertId),
        user_id: userId,
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

    const userId = req.user.id; // Obtener userId del token JWT

    // Actualizar el status de la alerta a 'resolved'
    await prisma.alerts.update({
      where: { id: parseInt(alertId) },
      data: {
        status: 'resolved',
      },
    });

    // Actualizar o crear registro en alert_read_status
    await prisma.alert_read_status.upsert({
      where: {
        alert_id_user_id: {
          alert_id: parseInt(alertId),
          user_id: userId,
        },
      },
      update: {
        status: 'resolved',
        updated_at: new Date(),
      },
      create: {
        alert_id: parseInt(alertId),
        user_id: userId,
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

/**
 * Eliminar una alerta de WhatsApp (soft delete)
 * - Marca como eliminada en alert_read_status para el usuario actual
 * - Solo para alertas confirmadas o rechazadas
 */
async function deleteWhatsAppBookingAlert(req, res) {
  try {
    const { alertId } = req.params;
    const userId = req.user.id; // Obtener userId del token JWT

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

    // Verificar que la alerta esté confirmada o rechazada
    if (alert.status !== 'resolved' && alert.status !== 'ignored') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden eliminar alertas confirmadas o rechazadas',
      });
    }

    // Soft delete: marcar como eliminada en alert_read_status
    await prisma.alert_read_status.upsert({
      where: {
        alert_id_user_id: {
          alert_id: parseInt(alertId),
          user_id: userId,
        },
      },
      update: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
      create: {
        alert_id: parseInt(alertId),
        user_id: userId,
        status: alert.status,
        deleted_at: new Date(),
      },
    });

    console.log(`🗑️ Usuario ${userId} eliminó alerta ${alertId} (soft delete)`);

    res.json({
      success: true,
      message: 'Alerta eliminada correctamente',
      data: {
        alertId: parseInt(alertId),
      },
    });
  } catch (error) {
    console.error('Error al eliminar alerta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la alerta',
    });
  }
}

/**
 * Eliminar múltiples alertas de WhatsApp (bulk soft delete)
 * - Marca como eliminadas en alert_read_status para el usuario actual
 * - Solo para alertas confirmadas o rechazadas
 * Body: { alertIds: [1, 2, 3] }
 */
async function deleteMultipleWhatsAppBookingAlerts(req, res) {
  try {
    const { alertIds } = req.body;
    const userId = req.user.id; // Obtener userId del token JWT

    // Validar que alertIds sea un array
    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe proporcionar un array de IDs de alertas',
      });
    }

    // Buscar todas las alertas
    const alerts = await prisma.alerts.findMany({
      where: {
        id: {
          in: alertIds.map(id => parseInt(id)),
        },
      },
    });

    // Verificar que todas las alertas existan
    if (alerts.length !== alertIds.length) {
      return res.status(404).json({
        success: false,
        message: 'Una o más alertas no fueron encontradas',
      });
    }

    // Verificar que todas las alertas estén confirmadas o rechazadas
    const invalidAlerts = alerts.filter(
      alert => alert.status !== 'resolved' && alert.status !== 'ignored'
    );

    if (invalidAlerts.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden eliminar alertas confirmadas o rechazadas',
      });
    }

    // Soft delete: marcar todas como eliminadas en alert_read_status
    const upsertPromises = alerts.map(alert =>
      prisma.alert_read_status.upsert({
        where: {
          alert_id_user_id: {
            alert_id: alert.id,
            user_id: userId,
          },
        },
        update: {
          deleted_at: new Date(),
          updated_at: new Date(),
        },
        create: {
          alert_id: alert.id,
          user_id: userId,
          status: alert.status,
          deleted_at: new Date(),
        },
      })
    );

    await Promise.all(upsertPromises);

    console.log(`🗑️ Usuario ${userId} eliminó ${alerts.length} alertas (soft delete)`);

    res.json({
      success: true,
      message: `${alerts.length} alerta${alerts.length !== 1 ? 's' : ''} eliminada${alerts.length !== 1 ? 's' : ''} correctamente`,
      count: alerts.length,
    });
  } catch (error) {
    console.error('Error al eliminar múltiples alertas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar las alertas',
    });
  }
}

module.exports = {
  getWhatsAppBookingAlerts,
  getWhatsAppBookingAlertsCount,
  markWhatsAppAlertsAsViewed,
  rejectWhatsAppBookingAlert,
  confirmWhatsAppBookingAlert,
  deleteWhatsAppBookingAlert,
  deleteMultipleWhatsAppBookingAlerts,
};
