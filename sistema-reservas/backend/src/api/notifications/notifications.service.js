const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Obtiene las reservas con check-out para el día actual en zona horaria de Chile
 * Retorna información detallada de habitaciones y huéspedes que deben hacer check-out hoy
 */
async function getCheckoutAlertsForToday() {
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

  // Consultar reservas con check-out hoy y estado activo
  const reservations = await prisma.reservations.findMany({
    where: {
      check_out_date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        in: ['in_progress', 'confirmed'], // Solo reservas activas
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
      check_out_date: 'asc',
    },
  });

  // Transformar los datos para una respuesta más limpia
  const alerts = reservations.map((reservation) => {
    const guest = reservation.users_reservations_main_guest_idTousers;
    const roomData = reservation.reservation_rooms[0]; // Asumimos una habitación por reserva
    const room = roomData?.rooms;

    return {
      reservationId: reservation.id,
      reservationCode: reservation.code,
      checkOutDate: reservation.check_out_date,
      checkOutTime: '11:00 AM', // Hora estándar de check-out
      guestInfo: {
        id: guest.id,
        fullName: `${guest.first_name} ${guest.paternal_last_name}${guest.maternal_last_name ? ' ' + guest.maternal_last_name : ''}`.trim(),
        email: guest.email,
        phone: guest.phone_number,
      },
      roomInfo: {
        id: room.id,
        number: room.room_number,
        floor: room.floor,
        type: room.room_types?.name || 'N/A',
        status: room.status,
      },
      status: reservation.status,
      guestCount: reservation.guest_count,
    };
  });

  return alerts;
}

/**
 * Obtiene solo el conteo de alertas de check-out para hoy
 * Útil para badges y notificaciones rápidas
 */
async function getCheckoutAlertsCount() {
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

  // Contar reservas con check-out hoy
  const count = await prisma.reservations.count({
    where: {
      check_out_date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        in: ['in_progress', 'confirmed'],
      },
    },
  });

  return count;
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

module.exports = {
  getCheckoutAlertsForToday,
  getCheckoutAlertsCount,
  getChileTime,
};
