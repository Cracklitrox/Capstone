const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Obtener habitaciones disponibles para upgrade
 *
 * @param {number} reservationId - ID de la reserva
 * @returns {Array} Lista de habitaciones disponibles para upgrade
 */
async function getAvailableUpgrades(reservationId) {
  // 1. Obtener la reserva y sus habitaciones actuales
  const reservation = await prisma.reservations.findUnique({
    where: { id: reservationId },
    include: {
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
  });

  if (!reservation) {
    throw new Error('Reserva no encontrada');
  }

  // 2. Validar que la reserva esté en estado válido para upgrade
  const validStatuses = ['confirmed', 'ready_for_checkin', 'in_progress'];
  if (!validStatuses.includes(reservation.status)) {
    throw new Error(
      'Solo se pueden hacer upgrades en reservas confirmadas o en progreso'
    );
  }

  // 3. Obtener los tipos de habitaciones actuales y sus precios
  const currentRoomTypes = reservation.reservation_rooms.map(rr => ({
    roomTypeId: rr.rooms.room_type_id,
    pricePerNight: parseFloat(rr.rooms.base_price),
    roomTypeName: rr.rooms.room_types.name,
  }));

  // Obtener el tipo más caro de las habitaciones actuales como referencia
  const maxCurrentPrice = Math.max(...currentRoomTypes.map(rt => rt.pricePerNight));

  // 4. Buscar habitaciones disponibles con precio superior
  const availableRooms = await prisma.rooms.findMany({
    where: {
      base_price: {
        gt: maxCurrentPrice,
      },
      status: 'available',
      is_active: true,
    },
    include: {
      room_types: true,
    },
    orderBy: {
      base_price: 'asc',
    },
  });

  if (availableRooms.length === 0) {
    return [];
  }

  // 5. Filtrar habitaciones que no tienen conflictos de reserva
  const availableUpgrades = [];

  for (const room of availableRooms) {
    const conflicts = await prisma.reservation_rooms.findMany({
      where: {
        room_id: room.id,
        reservations: {
          status: {
            in: ['confirmed', 'ready_for_checkin', 'in_progress', 'pending_checkout'],
          },
        },
        OR: [
          {
            start_date: {
              lt: reservation.check_out_date,
            },
            end_date: {
              gt: reservation.check_in_date,
            },
          },
        ],
      },
    });

    if (conflicts.length === 0) {
      // Calcular diferencia de precio
      const priceDifference = parseFloat(room.base_price) - maxCurrentPrice;

      // Calcular noches restantes
      const checkOut = new Date(reservation.check_out_date);
      const today = new Date();
      const remainingNights = Math.max(
        1,
        Math.ceil((checkOut.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      );

      const totalAdditionalCost = priceDifference * remainingNights;

      availableUpgrades.push({
        id: room.id,
        room_number: room.room_number,
        floor: room.floor,
        room_type: {
          id: room.room_types.id,
          name: room.room_types.name,
          capacity: room.room_types.base_capacity,
          price_per_night: room.base_price,
        },
        priceDifference,
        remainingNights,
        totalAdditionalCost,
      });
    }
  }

  return availableUpgrades;
}

/**
 * Realizar upgrade de habitación
 *
 * @param {number} reservationId - ID de la reserva
 * @param {number} oldRoomId - ID de la habitación actual (opcional, si no se provee se usa la primera)
 * @param {number} newRoomId - ID de la nueva habitación
 * @param {string} reason - Razón del upgrade
 * @param {number} userId - ID del usuario que realiza el upgrade
 * @returns {Object} Reserva actualizada
 */
async function upgradeRoom(reservationId, { oldRoomId, newRoomId, reason, userId }) {
  // 1. Obtener la reserva
  const reservation = await prisma.reservations.findUnique({
    where: { id: reservationId },
    include: {
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
  });

  if (!reservation) {
    throw new Error('Reserva no encontrada');
  }

  // 2. Determinar qué habitación cambiar
  let reservationRoom;
  if (oldRoomId) {
    reservationRoom = reservation.reservation_rooms.find(rr => rr.room_id === oldRoomId);
    if (!reservationRoom) {
      throw new Error('La habitación especificada no pertenece a esta reserva');
    }
  } else {
    // Si no se especifica, usar la primera habitación
    reservationRoom = reservation.reservation_rooms[0];
  }

  // 3. Obtener información de la nueva habitación
  const newRoom = await prisma.rooms.findUnique({
    where: { id: newRoomId },
    include: {
      room_types: true,
    },
  });

  if (!newRoom) {
    throw new Error('Nueva habitación no encontrada');
  }

  // 4. Validar que sea un upgrade (precio mayor)
  const oldPrice = parseFloat(reservationRoom.rooms.base_price);
  const newPrice = parseFloat(newRoom.base_price);

  if (newPrice <= oldPrice) {
    throw new Error('La nueva habitación debe ser de categoría superior (precio mayor)');
  }

  // 5. Calcular costo adicional
  const priceDifference = newPrice - oldPrice;
  const checkOut = new Date(reservation.check_out_date);
  const today = new Date();
  const remainingNights = Math.max(
    1,
    Math.ceil((checkOut.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  );
  const additionalCost = priceDifference * remainingNights;

  // 6. Realizar el upgrade en una transacción
  const result = await prisma.$transaction(async (tx) => {
    // 6.1 Actualizar la reservation_room
    await tx.reservation_rooms.update({
      where: { id: reservationRoom.id },
      data: {
        room_id: newRoomId,
        subtotal: {
          increment: additionalCost,
        },
      },
    });

    // 6.2 Actualizar el total de la reserva
    await tx.reservations.update({
      where: { id: reservationId },
      data: {
        total_amount: {
          increment: additionalCost,
        },
      },
    });

    // 6.3 Actualizar estados de habitaciones
    // Habitación antigua: volver a available o cleaning según corresponda
    const newOldRoomStatus = reservation.status === 'in_progress' ? 'cleaning' : 'available';
    await tx.rooms.update({
      where: { id: reservationRoom.room_id },
      data: {
        status: newOldRoomStatus,
      },
    });

    // Habitación nueva: occupied si ya está in_progress
    if (reservation.status === 'in_progress') {
      await tx.rooms.update({
        where: { id: newRoomId },
        data: {
          status: 'occupied',
        },
      });
    }

    // 6.4 Registrar en activity_logs
    await tx.activity_logs.create({
      data: {
        user_id: userId,
        action: 'UPDATE_RESERVATION',
        affected_table: 'reservation_rooms',
        record_id: reservationRoom.id,
        details: JSON.stringify({
          reservation_id: reservationId,
          change_type: 'upgrade_room',
          oldRoomId: reservationRoom.room_id,
          oldRoomNumber: reservationRoom.rooms.room_number,
          oldRoomType: reservationRoom.rooms.room_types.name,
          newRoomId,
          newRoomNumber: newRoom.room_number,
          newRoomType: newRoom.room_types.name,
          priceDifference,
          remainingNights,
          additionalCost,
          reason,
        }),
      },
    });

    // 6.5 Obtener y retornar la reserva actualizada
    const updatedReservation = await tx.reservations.findUnique({
      where: { id: reservationId },
      include: {
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
    });

    return updatedReservation;
  });

  return result;
}

/**
 * Cambiar habitación (misma categoría o inferior)
 *
 * @param {number} reservationId - ID de la reserva
 * @param {number} oldRoomId - ID de la habitación actual
 * @param {number} newRoomId - ID de la nueva habitación
 * @param {string} reason - Razón del cambio
 * @param {number} userId - ID del usuario que realiza el cambio
 * @returns {Object} Reserva actualizada
 */
async function changeRoom(reservationId, { oldRoomId, newRoomId, reason, userId }) {
  // 1. Validar que ambas habitaciones existan y sean diferentes
  if (oldRoomId === newRoomId) {
    throw new Error('La nueva habitación debe ser diferente a la actual');
  }

  const [oldRoom, newRoom] = await Promise.all([
    prisma.rooms.findUnique({
      where: { id: oldRoomId },
      include: { room_types: true },
    }),
    prisma.rooms.findUnique({
      where: { id: newRoomId },
      include: { room_types: true },
    }),
  ]);

  if (!oldRoom || !newRoom) {
    throw new Error('Una o ambas habitaciones no fueron encontradas');
  }

  // 2. Obtener la reservation_room
  const reservationRoom = await prisma.reservation_rooms.findFirst({
    where: {
      reservation_id: reservationId,
      room_id: oldRoomId,
    },
    include: {
      reservations: true,
    },
  });

  if (!reservationRoom) {
    throw new Error('La habitación especificada no pertenece a esta reserva');
  }

  // 3. Validar que la nueva habitación esté disponible
  if (newRoom.status !== 'available') {
    throw new Error(`La habitación ${newRoom.room_number} no está disponible (estado: ${newRoom.status})`);
  }

  // 4. Calcular ajuste de precio (puede ser positivo, negativo o cero)
  const oldPrice = parseFloat(oldRoom.base_price);
  const newPrice = parseFloat(newRoom.base_price);
  const priceDifference = newPrice - oldPrice;

  const checkOut = new Date(reservationRoom.reservations.check_out_date);
  const today = new Date();
  const remainingNights = Math.max(
    1,
    Math.ceil((checkOut.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  );
  const priceAdjustment = priceDifference * remainingNights;

  // 5. Realizar el cambio en una transacción
  const result = await prisma.$transaction(async (tx) => {
    // 5.1 Actualizar la reservation_room
    await tx.reservation_rooms.update({
      where: { id: reservationRoom.id },
      data: {
        room_id: newRoomId,
        subtotal: {
          increment: priceAdjustment,
        },
      },
    });

    // 5.2 Actualizar el total de la reserva
    if (priceAdjustment !== 0) {
      await tx.reservations.update({
        where: { id: reservationId },
        data: {
          total_amount: {
            increment: priceAdjustment,
          },
        },
      });
    }

    // 5.3 Actualizar estados de habitaciones
    const status = reservationRoom.reservations.status;
    const newOldRoomStatus = status === 'in_progress' ? 'cleaning' : 'available';

    await tx.rooms.update({
      where: { id: oldRoomId },
      data: { status: newOldRoomStatus },
    });

    if (status === 'in_progress') {
      await tx.rooms.update({
        where: { id: newRoomId },
        data: { status: 'occupied' },
      });
    }

    // 5.4 Registrar en activity_logs
    const adjustmentText = priceAdjustment === 0
      ? ''
      : priceAdjustment > 0
      ? ` (+${formatCLP(priceAdjustment)})`
      : ` (${formatCLP(priceAdjustment)})`;

    await tx.activity_logs.create({
      data: {
        user_id: userId,
        action: 'UPDATE_RESERVATION',
        affected_table: 'reservation_rooms',
        record_id: reservationRoom.id,
        details: JSON.stringify({
          reservation_id: reservationId,
          change_type: 'change_room',
          oldRoomId,
          oldRoomNumber: oldRoom.room_number,
          newRoomId,
          newRoomNumber: newRoom.room_number,
          priceAdjustment,
          reason,
        }),
      },
    });

    // 5.5 Obtener y retornar la reserva actualizada
    const updatedReservation = await tx.reservations.findUnique({
      where: { id: reservationId },
      include: {
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
    });

    return updatedReservation;
  });

  return result;
}

// ============================================
// Utilidades
// ============================================

function formatCLP(amount) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount);
}

module.exports = {
  getAvailableUpgrades,
  upgradeRoom,
  changeRoom,
};
