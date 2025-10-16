const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Función helper para crear logs de actividad
async function createActivityLog(
  userId,
  userRole,
  actionType,
  affectedTable,
  recordId,
  details = null
) {
  try {
    await prisma.activity_logs.create({
      data: {
        user_id: userId,
        user_role: userRole,
        action: actionType,
        affected_table: affectedTable,
        record_id: recordId,
        details: details ? JSON.stringify(details) : null,
      },
    });
  } catch (error) {
    console.error("Error al crear log de actividad:", error);
  }
}

async function getAllRooms() {
  const rooms = await prisma.rooms.findMany({
    orderBy: { id: "asc" },
    include: {
      room_types: { select: { name: true } },
      reservation_rooms: {
        where: {
          reservations: {
            status: { in: ["confirmed", "in_progress", "pending"] },
          },
        },
        orderBy: { start_date: "asc" },
        take: 1,
        include: {
          reservations: {
            include: {
              users_reservations_main_guest_idTousers: {
                select: { first_name: true, paternal_last_name: true },
              },
            },
          },
        },
      },
    },
  });

  return rooms.map((room) => {
    const activeReservation = room.reservation_rooms?.[0]?.reservations;
    const guest = activeReservation?.users_reservations_main_guest_idTousers;

    return {
      id: room.id,
      number: room.room_number,
      type: room.room_types?.name || "N/A",
      floor: room.floor,
      status: room.status,
      capacity: room.capacity,
      base_price: room.base_price,
      reservation: activeReservation
        ? {
            id: activeReservation.id,
            check_in_date: activeReservation.check_in_date,
            check_out_date: activeReservation.check_out_date,
            guest: guest
              ? {
                  first_name: guest.first_name,
                  paternal_last_name: guest.paternal_last_name,
                }
              : null,
          }
        : null,
    };
  });
}

async function getRoomById(roomId) {
  const id = Number(roomId);
  if (isNaN(id)) {
    throw new Error("El ID de la habitación debe ser un número válido.");
  }

  const room = await prisma.rooms.findUnique({
    where: { id: id },
    include: {
      room_types: true,
      cleaning_records: {
        orderBy: { record_date: "desc" },
        take: 10,
        include: {
          users: {
            select: { first_name: true, paternal_last_name: true },
          },
        },
      },
      maintenance_tasks: {
        orderBy: { created_at: "desc" },
        take: 10,
      },
      reservation_rooms: {
        where: {
          reservations: {
            status: { in: ["in_progress", "pending", "confirmed"] },
          },
        },
        take: 1,
        include: {
          reservations: {
            include: {
              users_reservations_main_guest_idTousers: {
                include: {
                  guest_details: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!room) {
    return null;
  }

  // Obtener reservas pasadas COMPLETAS con todos sus datos
  const pastReservations = await prisma.reservations.findMany({
    where: {
      status: "completed",
      reservation_rooms: {
        some: {
          room_id: id,
        },
      },
    },
    orderBy: {
      check_out_date: "desc",
    },
    take: 5,
    include: {
      users_reservations_main_guest_idTousers: {
        select: {
          first_name: true,
          paternal_last_name: true,
          maternal_last_name: true,
          identification_number: true,
          email: true,
          phone_number: true,
        },
      },
      reservation_rooms: {
        include: {
          rooms: {
            select: {
              room_number: true,
              room_types: {
                select: { name: true },
              },
            },
          },
        },
      },
      reservation_services: {
        include: {
          services: {
            select: { name: true },
          },
        },
      },
      payments: {
        select: {
          amount: true,
          payment_method: true,
          status: true,
        },
      },
    },
  });

  const activeReservationData = room.reservation_rooms?.[0]?.reservations;
  const mainGuestData =
    activeReservationData?.users_reservations_main_guest_idTousers;

  let currentReservation = null;
  if (activeReservationData) {
    const fullReservation = await prisma.reservations.findUnique({
      where: { id: activeReservationData.id },
      include: {
        users_reservations_main_guest_idTousers: {
          select: {
            first_name: true,
            paternal_last_name: true,
            maternal_last_name: true,
            identification_number: true,
            email: true,
            phone_number: true,
            guest_details: true,
          },
        },
        reservation_rooms: {
          include: {
            rooms: {
              select: {
                room_number: true,
                room_types: {
                  select: { name: true },
                },
              },
            },
          },
        },
        reservation_services: {
          include: {
            services: {
              select: { name: true },
            },
          },
        },
        payments: {
          select: {
            amount: true,
            payment_method: true,
            status: true,
          },
        },
      },
    });

    if (fullReservation) {
      // 🔧 CALCULAR PAID_AMOUNT SUMANDO PAGOS CONFIRMADOS
      const calculatedPaidAmount = fullReservation.payments
        .filter(p => p.status === 'completed' || p.status === 'confirmed')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      currentReservation = {
        reservationId: fullReservation.id,
        code: fullReservation.code,
        guestName: `${fullReservation.users_reservations_main_guest_idTousers.first_name} ${fullReservation.users_reservations_main_guest_idTousers.paternal_last_name} ${fullReservation.users_reservations_main_guest_idTousers.maternal_last_name || ""}`.trim(),
        guestIdentification:
          fullReservation.users_reservations_main_guest_idTousers
            .identification_number,
        guestEmail:
          fullReservation.users_reservations_main_guest_idTousers.email,
        guestPhone:
          fullReservation.users_reservations_main_guest_idTousers.phone_number,
        special_requests:
          fullReservation.users_reservations_main_guest_idTousers
            .guest_details?.special_requests,
        observations:
          fullReservation.users_reservations_main_guest_idTousers
            .guest_details?.observations,
        checkIn: fullReservation.check_in_date,
        checkOut: fullReservation.check_out_date,
        guestCount: fullReservation.guest_count,
        totalAmount: parseFloat(fullReservation.total_amount || 0),
        paidAmount: calculatedPaidAmount,
        rooms: fullReservation.reservation_rooms.map((rr) => ({
          number: rr.rooms.room_number,
          type: rr.rooms.room_types.name,
        })),
        services: fullReservation.reservation_services.map((rs) => ({
          name: rs.services.name,
          quantity: rs.quantity,
          unitPrice: parseFloat(rs.unit_price || 0),
        })),
        payments: fullReservation.payments.map((p) => ({
          amount: parseFloat(p.amount || 0),
          method: p.payment_method,
          status: p.status,
        })),
      };
    }
  }

  return {
    id: room.id,
    number: room.room_number,
    type: room.room_types.name,
    floor: room.floor,
    status: room.status,
    capacity: room.capacity,
    base_price: room.base_price,
    description: room.description,

    currentReservation: currentReservation,

    cleaningHistory: room.cleaning_records.map((record) => ({
      id: record.id,
      date: record.record_date,
      observations: record.observations,
      receptionist: `${record.users.first_name} ${record.users.paternal_last_name}`,
    })),

    maintenanceHistory: room.maintenance_tasks,

    reservationHistory: pastReservations.map((res) => {
      // 🔧 CALCULAR PAID_AMOUNT SUMANDO PAGOS CONFIRMADOS
      const calculatedPaidAmount = res.payments
        .filter(p => p.status === 'completed' || p.status === 'confirmed')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      return {
        reservationId: res.id,
        code: res.code,
        guestName: `${res.users_reservations_main_guest_idTousers.first_name} ${res.users_reservations_main_guest_idTousers.paternal_last_name} ${res.users_reservations_main_guest_idTousers.maternal_last_name || ""}`.trim(),
        guestIdentification:
          res.users_reservations_main_guest_idTousers.identification_number,
        guestEmail: res.users_reservations_main_guest_idTousers.email,
        guestPhone: res.users_reservations_main_guest_idTousers.phone_number,
        checkIn: res.check_in_date,
        checkOut: res.check_out_date,
        guestCount: res.guest_count,
        totalAmount: parseFloat(res.total_amount || 0),
        paidAmount: calculatedPaidAmount,
        rooms: res.reservation_rooms.map((rr) => ({
          number: rr.rooms.room_number,
          type: rr.rooms.room_types.name,
        })),
        services: res.reservation_services.map((rs) => ({
          name: rs.services.name,
          quantity: rs.quantity,
          unitPrice: parseFloat(rs.unit_price || 0),
        })),
        payments: res.payments.map((p) => ({
          amount: parseFloat(p.amount || 0),
          method: p.payment_method,
          status: p.status,
        })),
      };
    }),
  };
}

async function getAllRoomTypes() {
  return prisma.room_types.findMany({
    where: { is_active: true },
    orderBy: { name: "asc" },
  });
}

async function updateRoomStatus(roomId, newStatus, userId, userRole) {
  const id = Number(roomId);
  if (isNaN(id)) {
    throw new Error("El ID de la habitación debe ser un número válido.");
  }

  // Obtener el estado anterior
  const currentRoom = await prisma.rooms.findUnique({
    where: { id },
    select: { status: true, room_number: true },
  });

  if (!currentRoom) {
    throw new Error("Habitación no encontrada.");
  }

  // Actualizar el estado
  await prisma.rooms.update({
    where: { id },
    data: { status: newStatus },
  });

  // Crear log de actividad
  await createActivityLog(userId, userRole, "UPDATE_ROOM_STATUS", "rooms", id, {
    room_number: currentRoom.room_number,
    old_status: currentRoom.status,
    new_status: newStatus,
  });

  // 🔥 AQUÍ ESTÁ EL FIX: Retornar con el mismo formato que getAllRooms
  const room = await prisma.rooms.findUnique({
    where: { id },
    include: {
      room_types: { select: { name: true } },
      reservation_rooms: {
        where: {
          reservations: {
            status: { in: ["confirmed", "in_progress", "pending"] },
          },
        },
        orderBy: { start_date: "asc" },
        take: 1,
        include: {
          reservations: {
            include: {
              users_reservations_main_guest_idTousers: {
                select: { first_name: true, paternal_last_name: true },
              },
            },
          },
        },
      },
    },
  });

  const activeReservation = room.reservation_rooms?.[0]?.reservations;
  const guest = activeReservation?.users_reservations_main_guest_idTousers;

  return {
    id: room.id,
    number: room.room_number,
    type: room.room_types?.name || "N/A",
    floor: room.floor,
    status: room.status,
    capacity: room.capacity,
    base_price: room.base_price,
    reservation: activeReservation
      ? {
          id: activeReservation.id,
          check_in_date: activeReservation.check_in_date,
          check_out_date: activeReservation.check_out_date,
          guest: guest
            ? {
                first_name: guest.first_name,
                paternal_last_name: guest.paternal_last_name,
              }
            : null,
        }
      : null,
  };
}

module.exports = {
  getAllRooms,
  getRoomById,
  getAllRoomTypes,
  updateRoomStatus,
};
