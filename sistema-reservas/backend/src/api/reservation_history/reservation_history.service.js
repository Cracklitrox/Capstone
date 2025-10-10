const prisma = require("../../db/prisma.client");

/**
 * Obtiene un historial paginado y filtrado de reservas completadas.
 */
const getHistory = async (filters, pagination) => {
  const {
    identification_number,
    roomId,
    floor,
    startDate,
    endDate,
    minPrice,
    maxPrice,
  } = filters;
  const { page, limit } = pagination;

  const where = {
    status: "completed",
    AND: [],
  };

  // ✅ Filtro por RUT/Pasaporte
  if (identification_number) {
    where.AND.push({
      users_reservations_main_guest_idTousers: {
        identification_number: {
          contains: identification_number,
          mode: "insensitive",
        },
      },
    });
  }

  // ✅ FIX: Manejar filtros de habitaciones de forma optimizada
  // Combinar roomId y floor en un solo objeto cuando ambos están presentes
  const roomFilters = {};

  if (roomId) {
    // ✅ FIX: room_number es STRING, no usar parseInt
    roomFilters.room_number = String(roomId);
  }

  if (floor) {
    roomFilters.floor = parseInt(floor, 10);
  }

  // Si hay filtros de habitación, agregarlos como un solo "some"
  if (Object.keys(roomFilters).length > 0) {
    where.AND.push({
      reservation_rooms: {
        some: {
          rooms: roomFilters,
        },
      },
    });
  }

  // ✅ Filtro por fecha de Check-in
  if (startDate) {
    where.AND.push({ check_in_date: { gte: new Date(startDate) } });
  }

  // ✅ Filtro por fecha de Check-out
  if (endDate) {
    const nextDay = new Date(endDate);
    nextDay.setDate(nextDay.getDate() + 1);
    where.AND.push({ check_out_date: { lte: nextDay } });
  }

  // ✅ Filtro por precio mínimo
  if (minPrice) {
    where.AND.push({ total_amount: { gte: parseInt(minPrice, 10) } });
  }

  // ✅ Filtro por precio máximo
  if (maxPrice) {
    where.AND.push({ total_amount: { lte: parseInt(maxPrice, 10) } });
  }

  // Si no hay filtros, eliminar el array AND vacío
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
        check_in_date: "desc",
      },
      select: {
        id: true,
        guest_count: true,
        check_in_date: true,
        check_out_date: true,
        users_reservations_main_guest_idTousers: {
          select: {
            identification_number: true,
            first_name: true,
            paternal_last_name: true,
            guest_details: { select: { observations: true } },
          },
        },
        reservation_rooms: {
          select: { rooms: { select: { room_number: true } } },
          take: 1,
        },
      },
    }),
    prisma.reservations.count({ where }),
  ]);

  return {
    data: reservations.map((r) => ({
      reservation_id: r.id,
      identification_number:
        r.users_reservations_main_guest_idTousers.identification_number,
      nombre_cliente: `${r.users_reservations_main_guest_idTousers.first_name} ${r.users_reservations_main_guest_idTousers.paternal_last_name}`,
      grupo_asignado: r.guest_count,
      habitacion_reservada: r.reservation_rooms[0]?.rooms?.room_number || "N/A",
      observacion:
        r.users_reservations_main_guest_idTousers.guest_details?.observations ||
        "Sin observaciones",
      check_in_date: r.check_in_date,
      check_out_date: r.check_out_date,
    })),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Obtiene todos los detalles de una reserva específica por su ID.
 */
const getHistoryDetailById = async (id) => {
  const reservation = await prisma.reservations.findUnique({
    where: {
      id: id,
      status: "completed",
    },
    include: {
      users_reservations_main_guest_idTousers: {
        select: {
          first_name: true,
          paternal_last_name: true,
          email: true,
          phone_number: true,
          guest_details: true,
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
      reservation_services: {
        include: {
          services: true,
        },
      },
      reservation_guests: {
        include: {
          users: {
            select: {
              first_name: true,
              paternal_last_name: true,
            },
          },
        },
      },
      payments: true,
    },
  });

  if (!reservation) {
    throw new Error("Reserva no encontrada o no está completada.");
  }

  const checkIn = new Date(reservation.check_in_date);
  const checkOut = new Date(reservation.check_out_date);
  const diffTime = Math.abs(checkOut - checkIn);
  const days_stayed = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const paid_amount = reservation.payments.reduce(
    (sum, p) => sum + (p.amount || 0),
    0
  );
  const price_per_night =
    reservation.total_amount && days_stayed > 0
      ? reservation.total_amount / days_stayed
      : 0;

  return {
    ...reservation,
    days_stayed,
    paid_amount,
    price_per_night,
  };
};

/**
 * Actualiza la observación de una reserva específica.
 */
const updateObservation = async (id, observation) => {
  const reservation = await prisma.reservations.update({
    where: { id: parseInt(id) },
    data: {
      users_reservations_main_guest_idTousers: {
        update: {
          guest_details: {
            update: {
              observations: observation,
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
