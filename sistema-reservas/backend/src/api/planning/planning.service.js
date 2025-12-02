import prisma from '../../db/prisma.client.js';

/**
 * Calcula estadísticas de ocupación para un periodo específico
 * @param {Date} startDate - Fecha de inicio del rango
 * @param {Date} endDate - Fecha de fin del rango
 * @returns {Promise<Object>} Estadísticas del periodo
 */
async function calculatePeriodStats(startDate, endDate) {
  // Obtener todas las reservation_rooms que se cruzan con el periodo
  const reservationsInPeriod = await prisma.reservation_rooms.findMany({
    where: {
      start_date: { lte: endDate },
      end_date: { gte: startDate },
    },
    include: {
      reservations: {
        select: {
          status: true,
          reservation_services: {
            include: {
              services: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Contar habitaciones únicas ocupadas en el periodo
  const uniqueRoomIds = new Set(reservationsInPeriod.map((rr) => rr.room_id));

  // Total de habitaciones activas
  const totalRooms = await prisma.rooms.count({
    where: { is_active: true },
  });

  // Contar por estado
  const statsByStatus = reservationsInPeriod.reduce((acc, rr) => {
    const status = rr.reservations.status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // Calcular tasa de ocupación del periodo
  const occupancyRate =
    totalRooms > 0 ? ((uniqueRoomIds.size / totalRooms) * 100).toFixed(1) : 0;

  return {
    totalRooms,
    occupiedRooms: uniqueRoomIds.size,
    occupancyRate: parseFloat(occupancyRate),
    pending: statsByStatus.pending || 0,
    confirmed: statsByStatus.confirmed || 0,
    in_progress: statsByStatus.in_progress || 0,
  };
}

/**
 * Obtiene las reservas de habitaciones que se solapan con un rango de fechas.
 * @param {Date} startDate - Fecha de inicio del rango.
 * @param {Date} endDate - Fecha de fin del rango.
 * @returns {Promise<Object>} Un objeto con las habitaciones, sus reservas y estadísticas.
 */
async function getTapeChartData(startDate, endDate) {
  // 1. Busca todas las 'reservation_rooms' cuyo rango de fechas se cruza con el rango solicitado.
  const reservationRooms = await prisma.reservation_rooms.findMany({
    where: {
      start_date: { lte: endDate },
      end_date: { gte: startDate },
    },
    include: {
      reservations: {
        include: {
          users_reservations_main_guest_idTousers: {
            select: {
              first_name: true,
              paternal_last_name: true,
            },
          },
          reservation_guests: {
            select: {
              id: true,
            },
          },
          reservation_services: {
            include: {
              services: {
                select: {
                  name: true,
                },
              },
            },
          },
          payments: {
            select: {
              amount: true,
            },
          },
        },
      },
      rooms: {
        include: {
          room_types: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      rooms: {
        room_number: "asc",
      },
    },
  });

  // 2. Agrupa los resultados por habitación
  const roomsData = reservationRooms.reduce((acc, rr) => {
    const roomId = rr.room_id;

    if (!acc[roomId]) {
      acc[roomId] = {
        roomId: rr.room_id,
        roomNumber: rr.rooms.room_number,
        roomType: rr.rooms.room_types.name,
        reservations: [],
      };
    }

    // Calcular total de huéspedes (principal + adicionales)
    const totalGuests = 1 + (rr.reservations.reservation_guests?.length || 0);

    // Calcular monto pagado
    const paidAmount =
      rr.reservations.payments?.reduce(
        (sum, payment) => sum + parseFloat(payment.amount || 0),
        0
      ) || 0;

    // Obtener nombres de servicios
    const services =
      rr.reservations.reservation_services?.map((rs) => rs.services.name) || [];

    acc[roomId].reservations.push({
      reservationId: rr.reservation_id,
      reservationCode: rr.reservations.code,
      checkIn: rr.reservations.check_in_date,
      checkOut: rr.reservations.check_out_date,
      status: rr.reservations.status,
      channel: rr.reservations.channel,
      guestName: `${rr.reservations.users_reservations_main_guest_idTousers.first_name} ${rr.reservations.users_reservations_main_guest_idTousers.paternal_last_name}`,
      totalGuests,
      services,
      totalAmount: parseFloat(rr.reservations.total_amount || 0),
      paidAmount,
    });

    return acc;
  }, {});

  // 3. Calcular estadísticas del periodo
  const stats = await calculatePeriodStats(startDate, endDate);

  // 4. Devolver data + stats
  return {
    rooms: Object.values(roomsData),
    stats,
  };
}

export default {
  getTapeChartData,
};
