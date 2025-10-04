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
  // --- CORRECCIÓN ---: Filtra por el número de habitación (room_number) en lugar del ID interno.
  if (roomId) {
    where.AND.push({ reservation_rooms: { some: { rooms: { room_number: parseInt(roomId) } } } });
  }
  if (floor) {
    where.AND.push({ reservation_rooms: { some: { rooms: { floor: parseInt(floor) } } } });
  }
  if (startDate) {
    where.AND.push({ check_in_date: { gte: new Date(startDate) } });
  }
  if (endDate) {
    // Ajustado para que la búsqueda incluya el día completo de la fecha final
    const nextDay = new Date(endDate);
    nextDay.setDate(nextDay.getDate() + 1);
    where.AND.push({ check_out_date: { lte: nextDay } });
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
        check_in_date: 'desc', // Ordenamos por fecha de ingreso para mayor relevancia
      },
      select: {
        id: true,
        guest_count: true,
        // --- CORRECCIÓN ---: Se añaden las fechas a la consulta de la base de datos
        check_in_date: true,
        check_out_date: true,
        users_reservations_main_guest_idTousers: {
          select: { rut: true, first_name: true, paternal_last_name: true, guest_details: { select: { observations: true } } }
        },
        reservation_rooms: {
          select: { rooms: { select: { room_number: true } } },
          take: 1 // Solo necesitamos una habitación para la vista de tabla
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
      observacion: r.users_reservations_main_guest_idTousers.guest_details?.observations || 'Sin observaciones',
      // --- CORRECCIÓN ---: Se añaden las fechas a la respuesta que se envía al frontend
      check_in_date: r.check_in_date,
      check_out_date: r.check_out_date
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
 * (Esta función de tu código original no necesita cambios)
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

  // 🟢 Cálculo del monto pagado y precio por noche
  const paid_amount = reservation.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const price_per_night = reservation.total_amount && days_stayed > 0
    ? reservation.total_amount / days_stayed
    : 0;

  return {
    ...reservation,
    days_stayed,
    paid_amount,
    price_per_night
  };
};


/** * Actualiza la observación de una reserva específica.
 * (Esta función de tu código original no necesita cambios)
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