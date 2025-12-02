import prisma from '../../db/prisma.client.js';

/**
 * Obtiene las alertas de checkout del día actual desde la tabla alerts
 * Retorna información detallada de las reservas con checkout programado para hoy
 * Filtra solo las alertas que el usuario NO ha marcado como leídas
 * @param {number} userId - ID del usuario (opcional, si no se pasa retorna todas)
 */
async function getCheckoutAlertsForToday(userId = null) {
  // Configurar fecha actual en zona horaria de Chile (UTC-3)
  const now = new Date();
  const chileOffset = -3 * 60; // Chile está en UTC-3
  const localOffset = now.getTimezoneOffset();
  const chileTime = new Date(now.getTime() + (localOffset + chileOffset) * 60 * 1000);

  // Inicio del día en Chile (00:00:00)
  const startOfDay = new Date(chileTime);
  startOfDay.setHours(0, 0, 0, 0);

  // Fin del día en Chile (23:59:59)
  const endOfDay = new Date(chileTime);
  endOfDay.setHours(23, 59, 59, 999);

  // Construir where clause base
  const whereClause = {
    type: 'checkout',
    created_at: {
      gte: startOfDay,
      lte: endOfDay,
    },
    status: {
      in: ['pending', 'resolved'], // Incluir pending y resolved
    },
  };

  // Si se proporciona userId, filtrar solo alertas NO vistas por este usuario
  if (userId) {
    whereClause.alert_read_status = {
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
    };
  }

  // Consultar alertas de checkout creadas hoy
  const checkoutAlerts = await prisma.alerts.findMany({
    where: whereClause,
    include: {
      reservations: {
        include: {
          users_reservations_main_guest_idTousers: {
            select: {
              id: true,
              first_name: true,
              paternal_last_name: true,
              maternal_last_name: true,
              email: true,
              phone_number: true,
            },
          },
          reservation_rooms: {
            include: {
              rooms: {
                include: {
                  room_types: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      created_at: 'asc',
    },
  });

  // Transformar los datos al mismo formato que antes para compatibilidad
  const alerts = checkoutAlerts
    .filter(alert => alert.reservations) // Filtrar alertas sin reserva
    .map((alert) => {
      const reservation = alert.reservations;
      const guest = reservation.users_reservations_main_guest_idTousers;

      // Obtener todas las habitaciones de esta reserva
      const rooms = reservation.reservation_rooms.map((roomData) => ({
        id: roomData.rooms.id,
        number: roomData.rooms.room_number,
        floor: roomData.rooms.floor,
        type: roomData.rooms.room_types?.name || 'N/A',
        status: roomData.rooms.status,
        startDate: roomData.start_date,
        endDate: roomData.end_date,
        price: roomData.unit_price,
        subtotal: roomData.subtotal,
      }));

      return {
        alertId: alert.id, // ID de la alerta
        reservationId: reservation.id,
        reservationCode: reservation.code,
        checkOutDate: reservation.check_out_date,
        checkOutTime: '11:00 AM', // Hora estándar de check-out
        guestInfo: {
          id: guest.id,
          fullName: `${guest.first_name} ${guest.paternal_last_name}${guest.maternal_last_name ? ' ' + guest.maternal_last_name : ''}`.trim(),
          firstName: guest.first_name,
          paternalLastName: guest.paternal_last_name,
          maternalLastName: guest.maternal_last_name,
          email: guest.email,
          phone: guest.phone_number,
        },
        rooms: rooms, // Array de todas las habitaciones
        roomCount: rooms.length, // Número de habitaciones
        status: reservation.status,
        guestCount: reservation.guest_count,
        detail: alert.detail, // Campo detail de la alerta
        createdAt: alert.created_at, // Cuándo se creó la alerta
      };
    });

  return alerts;
}

/**
 * Crea o actualiza alertas de checkout en la tabla alerts
 * Esto debe ejecutarse periódicamente (ej. cada 5 minutos por el cron job)
 * @returns {Object} Resultado de la operación
 */
async function createOrUpdateCheckoutAlerts() {
  try {
    // Obtener checkouts de hoy
    const checkouts = await getCheckoutAlertsForToday();

    // Obtener fecha actual en Chile
    const now = new Date();
    const chileOffset = -3 * 60;
    const localOffset = now.getTimezoneOffset();
    const chileTime = new Date(now.getTime() + (localOffset + chileOffset) * 60 * 1000);
    const startOfDay = new Date(chileTime);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(chileTime);
    endOfDay.setHours(23, 59, 59, 999);

    // Crear o actualizar una alerta por cada reserva con checkout hoy
    for (const checkout of checkouts) {
      // Verificar si ya existe una alerta de checkout para esta reserva hoy
      const existingAlert = await prisma.alerts.findFirst({
        where: {
          reservation_id: checkout.reservationId,
          type: 'checkout',
          created_at: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      if (!existingAlert) {
        // Crear nueva alerta de checkout
        await prisma.alerts.create({
          data: {
            type: 'checkout',
            status: 'pending',
            reservation_id: checkout.reservationId,
            detail: `Check-out hoy: ${checkout.guestInfo.fullName} - ${checkout.roomCount} hab.`,
            full_summary: checkout,
          },
        });
      } else {
        // Actualizar alerta existente con datos más recientes
        await prisma.alerts.update({
          where: { id: existingAlert.id },
          data: {
            full_summary: checkout,
            detail: `Check-out hoy: ${checkout.guestInfo.fullName} - ${checkout.roomCount} hab.`,
          },
        });
      }
    }

    return {
      success: true,
      checkoutsCount: checkouts.length,
      message: `${checkouts.length} alertas de checkout procesadas`,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Obtiene el conteo de alertas de checkout no leídas para un usuario
 * @param {number} userId - ID del usuario
 * @returns {Promise<number>} Número de alertas no leídas
 */
async function getCheckoutAlertsCount(userId) {
  try {

    // Obtener fecha actual UTC
    const now = new Date();

    // Calcular el inicio del día de HOY en Chile y convertirlo a UTC
    // Chile está en UTC-3
    const chileOffsetHours = -3;

    // Obtener la hora actual en Chile
    const chileNow = new Date(now.getTime() + (chileOffsetHours * 60 * 60 * 1000));

    // Inicio del día en Chile (00:00:00 hora de Chile)
    const startOfDayChile = new Date(chileNow);
    startOfDayChile.setUTCHours(0, 0, 0, 0);

    // Convertir a UTC: si es 00:00 en Chile (UTC-3), es 03:00 UTC
    const startOfDay = new Date(startOfDayChile.getTime() - (chileOffsetHours * 60 * 60 * 1000));

    // Fin del día en Chile (23:59:59 hora de Chile)
    const endOfDayChile = new Date(chileNow);
    endOfDayChile.setUTCHours(23, 59, 59, 999);

    // Convertir a UTC
    const endOfDay = new Date(endOfDayChile.getTime() - (chileOffsetHours * 60 * 60 * 1000));


    // Primero contar TODAS las alertas de checkout de hoy
    const totalCheckoutAlerts = await prisma.alerts.count({
      where: {
        type: 'checkout',
        created_at: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });


    // Contar alertas de checkout creadas hoy que el usuario no ha marcado como leídas o eliminadas
    const count = await prisma.alerts.count({
      where: {
        type: 'checkout',
        created_at: {
          gte: startOfDay,
          lte: endOfDay,
        },
        // No debe tener un registro de lectura para este usuario con status resolved/ignored o deleted_at no null
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


    return count;
  } catch (error) {
    return 0;
  }
}

/**
 * Marca todas las alertas de checkout de hoy como leídas por el usuario
 * @param {number} userId - ID del usuario
 * @returns {Object} Resultado de la operación
 */
async function markCheckoutAlertsAsViewed(userId) {
  try {
    // Obtener fecha actual UTC
    const now = new Date();
    const viewedAt = new Date();

    // Calcular el inicio del día de HOY en Chile y convertirlo a UTC
    const chileOffsetHours = -3;
    const chileNow = new Date(now.getTime() + (chileOffsetHours * 60 * 60 * 1000));

    // Inicio del día en Chile (00:00:00 hora de Chile)
    const startOfDayChile = new Date(chileNow);
    startOfDayChile.setUTCHours(0, 0, 0, 0);
    const startOfDay = new Date(startOfDayChile.getTime() - (chileOffsetHours * 60 * 60 * 1000));

    // Fin del día en Chile (23:59:59 hora de Chile)
    const endOfDayChile = new Date(chileNow);
    endOfDayChile.setUTCHours(23, 59, 59, 999);
    const endOfDay = new Date(endOfDayChile.getTime() - (chileOffsetHours * 60 * 60 * 1000));

    // Obtener todas las alertas de checkout de hoy
    const checkoutAlerts = await prisma.alerts.findMany({
      where: {
        type: 'checkout',
        created_at: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Si no hay alertas, retornar éxito sin hacer nada
    if (!checkoutAlerts || checkoutAlerts.length === 0) {
      return {
        success: true,
        message: 'No hay alertas de checkout para hoy',
        count: 0,
      };
    }

    // Actualizar cada alerta con last_viewed_at y crear registros de lectura
    const updatePromises = checkoutAlerts.map(async (alert) => {
      try {
        // Actualizar last_viewed_at en la alerta
        await prisma.alerts.update({
          where: { id: alert.id },
          data: { last_viewed_at: viewedAt },
        });

        // Crear/actualizar registro de lectura
        await prisma.alert_read_status.upsert({
          where: {
            alert_id_user_id: {
              alert_id: alert.id,
              user_id: userId,
            },
          },
          update: {
            status: 'resolved',
            updated_at: viewedAt,
          },
          create: {
            alert_id: alert.id,
            user_id: userId,
            status: 'resolved',
          },
        });
      } catch (err) {
        // Log individual error but don't fail the entire operation
        console.error(`Error updating alert ${alert.id}:`, err.message);
      }
    });

    await Promise.all(updatePromises);


    return {
      success: true,
      message: 'Checkout alerts marked as viewed',
      count: checkoutAlerts.length,
    };
  } catch (error) {
    console.error('Error in markCheckoutAlertsAsViewed:', error);
    console.error('Error stack:', error.stack);
    // Return error response instead of throwing
    return {
      success: false,
      message: 'Error al marcar alertas como vistas',
      error: error.message,
      count: 0,
    };
  }
}

/**
 * Verifica si el usuario ya vio todas las alertas de checkout de hoy
 * @param {number} userId - ID del usuario
 * @returns {Promise<boolean>} True si ya vio todas, false si no
 */
async function hasUserViewedCheckoutsToday(userId) {
  try {
    const count = await getCheckoutAlertsCount(userId);
    return count === 0;
  } catch (error) {
    return false;
  }
}

/**
 * Elimina (soft delete) una alerta de checkout para un usuario
 * @param {number} alertId - ID de la alerta
 * @param {number} userId - ID del usuario
 * @returns {Object} Resultado de la operación
 */
async function deleteCheckoutAlert(alertId, userId) {
  try {
    // Verificar que la alerta existe y es de tipo checkout
    const alert = await prisma.alerts.findFirst({
      where: {
        id: alertId,
        type: 'checkout',
      },
    });

    if (!alert) {
      throw new Error('Alerta de checkout no encontrada');
    }

    // Marcar como eliminada en alert_read_status
    const result = await prisma.alert_read_status.upsert({
      where: {
        alert_id_user_id: {
          alert_id: alertId,
          user_id: userId,
        },
      },
      update: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
      create: {
        alert_id: alertId,
        user_id: userId,
        status: 'ignored',
        deleted_at: new Date(),
      },
    });


    return {
      success: true,
      message: 'Alerta de checkout eliminada',
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Obtiene la hora actual en zona horaria de Chile
 * Útil para logs y debugging
 */
function getChileTime() {
  const now = new Date();
  const chileOffset = -3 * 60; // Chile está en UTC-3
  const localOffset = now.getTimezoneOffset();
  const chileTime = new Date(now.getTime() + (localOffset + chileOffset) * 60 * 1000);

  return {
    date: chileTime.toISOString().split('T')[0],
    time: chileTime.toTimeString().split(' ')[0],
    fullDateTime: chileTime.toISOString(),
  };
}

/**
 * Obtiene reservas con check-out pasado (días anteriores)
 * @param {number} daysBack - Número de días hacia atrás (default: 7)
 */
async function getPastCheckouts(daysBack = 7) {
  const now = new Date();
  const chileOffset = -3 * 60;
  const localOffset = now.getTimezoneOffset();
  const chileTime = new Date(now.getTime() + (localOffset + chileOffset) * 60 * 1000);

  // Inicio de hoy
  const startOfToday = new Date(chileTime);
  startOfToday.setHours(0, 0, 0, 0);

  // Inicio del rango (X días atrás)
  const startOfRange = new Date(startOfToday);
  startOfRange.setDate(startOfRange.getDate() - daysBack);

  const reservations = await prisma.reservations.findMany({
    where: {
      check_out_date: {
        gte: startOfRange,
        lt: startOfToday, // Antes de hoy
      },
      status: {
        in: ['completed', 'in_progress', 'confirmed'],
      },
    },
    include: {
      users_reservations_main_guest_idTousers: {
        select: {
          id: true,
          first_name: true,
          paternal_last_name: true,
          maternal_last_name: true,
          email: true,
          phone_number: true,
        },
      },
      reservation_rooms: {
        include: {
          rooms: {
            include: {
              room_types: true,
            },
          },
        },
      },
    },
    orderBy: {
      check_out_date: 'desc', // Más recientes primero
    },
  });

  return formatCheckoutData(reservations);
}

/**
 * Obtiene reservas con check-out futuro (días posteriores)
 * @param {number} daysAhead - Número de días hacia adelante (default: 7)
 */
async function getFutureCheckouts(daysAhead = 7) {
  const now = new Date();
  const chileOffset = -3 * 60;
  const localOffset = now.getTimezoneOffset();
  const chileTime = new Date(now.getTime() + (localOffset + chileOffset) * 60 * 1000);

  // Fin de hoy
  const endOfToday = new Date(chileTime);
  endOfToday.setHours(23, 59, 59, 999);

  // Fin del rango (X días adelante)
  const endOfRange = new Date(endOfToday);
  endOfRange.setDate(endOfRange.getDate() + daysAhead);

  const reservations = await prisma.reservations.findMany({
    where: {
      check_out_date: {
        gt: endOfToday, // Después de hoy
        lte: endOfRange,
      },
      status: {
        in: ['in_progress', 'confirmed', 'pending'],
      },
    },
    include: {
      users_reservations_main_guest_idTousers: {
        select: {
          id: true,
          first_name: true,
          paternal_last_name: true,
          maternal_last_name: true,
          email: true,
          phone_number: true,
        },
      },
      reservation_rooms: {
        include: {
          rooms: {
            include: {
              room_types: true,
            },
          },
        },
      },
    },
    orderBy: {
      check_out_date: 'asc', // Más cercanos primero
    },
  });

  return formatCheckoutData(reservations);
}

/**
 * Función auxiliar para formatear datos de checkout
 * Agrupa por huésped con todas sus habitaciones
 */
function formatCheckoutData(reservations) {
  return reservations.map((reservation) => {
    const guest = reservation.users_reservations_main_guest_idTousers;

    // Obtener todas las habitaciones de esta reserva
    const rooms = reservation.reservation_rooms.map((roomData) => ({
      id: roomData.rooms.id,
      number: roomData.rooms.room_number,
      floor: roomData.rooms.floor,
      type: roomData.rooms.room_types?.name || 'N/A',
      status: roomData.rooms.status,
      startDate: roomData.start_date,
      endDate: roomData.end_date,
      price: roomData.unit_price,
      subtotal: roomData.subtotal,
    }));

    return {
      reservationId: reservation.id,
      reservationCode: reservation.code,
      checkInDate: reservation.check_in_date,
      checkOutDate: reservation.check_out_date,
      checkOutTime: '11:00 AM',
      guestInfo: {
        id: guest.id,
        fullName: `${guest.first_name} ${guest.paternal_last_name}${guest.maternal_last_name ? ' ' + guest.maternal_last_name : ''}`.trim(),
        firstName: guest.first_name,
        paternalLastName: guest.paternal_last_name,
        maternalLastName: guest.maternal_last_name,
        email: guest.email,
        phone: guest.phone_number,
      },
      rooms: rooms,
      roomCount: rooms.length,
      status: reservation.status,
      guestCount: reservation.guest_count,
      totalAmount: reservation.total_amount,
      paidAmount: reservation.paid_amount,
    };
  });
}

export default {
  getCheckoutAlertsForToday,
  getCheckoutAlertsCount,
  getChileTime,
  getPastCheckouts,
  getFutureCheckouts,
  createOrUpdateCheckoutAlerts,
  markCheckoutAlertsAsViewed,
  hasUserViewedCheckoutsToday,
  deleteCheckoutAlert,
};
