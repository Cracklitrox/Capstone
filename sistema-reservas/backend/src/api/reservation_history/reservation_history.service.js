// backend/src/api/reservation_history/reservation_history.service.js

const prisma = require('../../db/prisma.client');

/**
 * Obtiene un historial paginado y filtrado de reservas completadas.
 */
const getHistory = async (filters, pagination) => {
  const { rut, roomId, floor, startDate, endDate, minPrice, maxPrice } = filters;
  const { page, limit } = pagination;

  const where = {
    status: 'completed',
    AND: [],
  };

  if (rut) {
    where.AND.push({
      users_reservations_main_guest_idTousers: { rut: { contains: rut, mode: 'insensitive' } }
    });
  }
  if (roomId) {
    where.AND.push({ reservation_rooms: { some: { room_id: parseInt(roomId) } } });
  }
  if (floor) {
    where.AND.push({ reservation_rooms: { some: { rooms: { floor: parseInt(floor) } } } });
  }
  if (startDate) {
    where.AND.push({ check_in_date: { gte: new Date(startDate) } });
  }
  if (endDate) {
    where.AND.push({ check_out_date: { lte: new Date(endDate) } });
  }
  if (minPrice) {
    where.AND.push({ total_amount: { gte: parseInt(minPrice) } });
  }
  if (maxPrice) {
    where.AND.push({ total_amount: { lte: parseInt(maxPrice) } });
  }

  if (where.AND.length === 0) {
    delete where.AND;
  }

  const skip = (page - 1) * limit;

  const [reservations, total] = await prisma.$transaction([
    prisma.reservations.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        updated_at: 'desc',
      },
      select: {
        id: true,
        guest_count: true,
        users_reservations_main_guest_idTousers: {
          select: { rut: true, first_name: true, paternal_last_name: true, guest_details: { select: { observations: true } } }
        },
        reservation_rooms: {
          select: { rooms: { select: { room_number: true } } }
        }
      }
    }),
    prisma.reservations.count({ where })
  ]);

  return {
    data: reservations.map(r => ({
      reservation_id: r.id,
      rut: r.users_reservations_main_guest_idTousers.rut,
      nombre_cliente: `${r.users_reservations_main_guest_idTousers.first_name} ${r.users_reservations_main_guest_idTousers.paternal_last_name}`,
      grupo_asignado: r.guest_count,
      habitacion_reservada: r.reservation_rooms[0]?.rooms?.room_number || 'N/A',
      observacion: r.users_reservations_main_guest_idTousers.guest_details?.observations || 'Sin observaciones'
    })),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  };
};

/**
 * Obtiene todos los detalles de una reserva específica por su ID.
 * @param {number} id - El ID de la reserva a buscar.
 */
const getHistoryDetailById = async (id) => {
  const reservation = await prisma.reservations.findUnique({
    where: {
      id: id,
      status: 'completed',
    },
    include: {
      users_reservations_main_guest_idTousers: {
        select: {
          first_name: true,
          paternal_last_name: true,
          email: true,
          phone_number: true,
          guest_details: true,
        }
      },
      reservation_rooms: {
        include: {
          rooms: {
            include: {
              room_types: true,
            }
          }
        }
      },
      reservation_services: {
        include: {
          services: true,
        }
      },
      reservation_guests: {
        include: {
          users: {
            select: {
              first_name: true,
              paternal_last_name: true,
            }
          }
        }
      },
      payments: true,
    }
  });

  if (!reservation) {
    throw new Error('Reserva no encontrada o no está completada.');
  }
  
  const checkIn = new Date(reservation.check_in_date);
  const checkOut = new Date(reservation.check_out_date);
  const diffTime = Math.abs(checkOut - checkIn);
  const days_stayed = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return { ...reservation, days_stayed };
};


/** * Actualiza la observación de una reserva específica.
 * @param {number} id - El ID de la reserva a actualizar.
 * @param {string} observation - La nueva observación.
 */
const updateObservation = async (id, observation) => {
  // Buscamos la reserva por su ID
  const reservation = await prisma.reservations.update({
    where: { id: parseInt(id) },
    data: {
      users_reservations_main_guest_idTousers: {
        update: {
          guest_details: {
            update: {
              observations: observation,  // Actualizamos la observación
            },
          },
        },
      },
    },
  });

  return reservation;
};

module.exports = {
  getHistory,
  getHistoryDetailById,
  updateObservation,
};