const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Obtiene las reservas de habitaciones que se solapan con un rango de fechas.
 * @param {Date} startDate - Fecha de inicio del rango.
 * @param {Date} endDate - Fecha de fin del rango.
 * @returns {Promise<Object>} Un objeto con las habitaciones y sus reservas en ese rango.
 */
async function getTapeChartData(startDate, endDate) {
  // 1. Busca todas las 'reservation_rooms' cuyo rango de fechas se cruza con el rango solicitado.
  const reservationRooms = await prisma.reservation_rooms.findMany({
    where: {
      // La lógica de solapamiento:
      // - La reserva empieza ANTES de que termine nuestro rango Y
      // - La reserva termina DESPUÉS de que empiece nuestro rango.
      start_date: { lte: endDate },
      end_date: { gte: startDate },
    },
    include: {
      // Incluimos la reserva para obtener su estado y los datos del huésped.
      reservations: {
        include: {
          users_reservations_main_guest_idTousers: {
            select: {
              first_name: true,
              paternal_last_name: true,
            },
          },
        },
      },
      // Incluimos la habitación para obtener su número y tipo.
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
        room_number: 'asc', // Ordenar por número de habitación
      },
    },
  });

  // 2. Agrupa los resultados por habitación para que sea más fácil de usar en el frontend.
  const roomsData = reservationRooms.reduce((acc, rr) => {
    const roomId = rr.room_id;
    
    // Si es la primera vez que vemos esta habitación, la añadimos al acumulador.
    if (!acc[roomId]) {
      acc[roomId] = {
        roomId: rr.room_id,
        roomNumber: rr.rooms.room_number,
        roomType: rr.rooms.room_types.name,
        reservations: [],
      };
    }

    // Añadimos la información formateada de la reserva a la habitación correspondiente.
    acc[roomId].reservations.push({
      reservationId: rr.reservation_id,
      checkIn: rr.reservations.check_in_date,
      checkOut: rr.reservations.check_out_date,
      status: rr.reservations.status,
      guestName: `${rr.reservations.users_reservations_main_guest_idTousers.first_name} ${rr.reservations.users_reservations_main_guest_idTousers.paternal_last_name}`,
    });

    return acc;
  }, {});

  // 3. Convertimos el objeto en un array, que es el formato estándar para una API REST.
  return Object.values(roomsData);
}

module.exports = {
  getTapeChartData,
};