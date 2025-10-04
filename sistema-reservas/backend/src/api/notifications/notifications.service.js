const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Obtiene las reservas con check-out para el día actual en zona horaria de Chile
 * Retorna información detallada de habitaciones y huéspedes que deben hacer check-out hoy
 * Agrupa por huésped principal mostrando todas sus habitaciones
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

  // Transformar los datos agrupando por huésped con todas sus habitaciones
  const alerts = reservations.map((reservation) => {
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

module.exports = {
  getCheckoutAlertsForToday,
  getCheckoutAlertsCount,
  getChileTime,
  getPastCheckouts,
  getFutureCheckouts,
};
