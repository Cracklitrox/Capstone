const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Verificar disponibilidad para extensión de estadía
 *
 * @param {number} reservationId - ID de la reserva
 * @param {string} newCheckOutDate - Nueva fecha de check-out (ISO string)
 * @returns {Object} Información de disponibilidad y costo adicional
 */
async function checkExtensionAvailability(reservationId, newCheckOutDate) {
  // 1. Obtener la reserva actual
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

  // 2. Validar que la reserva esté en estado válido para extensión
  const validStatuses = ['confirmed', 'ready_for_checkin', 'in_progress'];
  if (!validStatuses.includes(reservation.status)) {
    throw new Error(
      `No se puede extender una reserva con estado "${reservation.status}". ` +
      'Solo se permiten extensiones en reservas confirmadas o en progreso.'
    );
  }

  // 3. Validar que la nueva fecha sea posterior a la actual
  const currentCheckOut = new Date(reservation.check_out_date);
  const newCheckOut = new Date(newCheckOutDate);

  if (newCheckOut <= currentCheckOut) {
    throw new Error('La nueva fecha de check-out debe ser posterior a la actual');
  }

  // 4. Calcular noches adicionales
  const diffTime = newCheckOut.getTime() - currentCheckOut.getTime();
  const additionalNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // 5. Verificar disponibilidad de TODAS las habitaciones para las noches adicionales
  const roomIds = reservation.reservation_rooms.map(rr => rr.room_id);

  for (const roomId of roomIds) {
    const conflicts = await prisma.reservation_rooms.findMany({
      where: {
        room_id: roomId,
        reservations: {
          status: {
            in: ['confirmed', 'ready_for_checkin', 'in_progress', 'pending_checkout'],
          },
          id: {
            not: reservationId, // Excluir la reserva actual
          },
        },
        OR: [
          // Conflicto 1: Otra reserva empieza durante el período de extensión
          {
            start_date: {
              gte: currentCheckOut,
              lt: newCheckOut,
            },
          },
          // Conflicto 2: Otra reserva termina durante el período de extensión
          {
            end_date: {
              gt: currentCheckOut,
              lte: newCheckOut,
            },
          },
          // Conflicto 3: Otra reserva cubre todo el período de extensión
          {
            AND: [
              {
                start_date: {
                  lte: currentCheckOut,
                },
              },
              {
                end_date: {
                  gte: newCheckOut,
                },
              },
            ],
          },
        ],
      },
      include: {
        rooms: {
          select: {
            room_number: true,
          },
        },
        reservations: {
          select: {
            code: true,
            check_in_date: true,
            check_out_date: true,
          },
        },
      },
    });

    if (conflicts.length > 0) {
      const room = reservation.reservation_rooms.find(rr => rr.room_id === roomId);
      return {
        available: false,
        reason: `La habitación ${room.rooms.room_number} no está disponible para el período solicitado`,
        conflictingReservation: {
          code: conflicts[0].reservations.code,
          checkIn: conflicts[0].reservations.check_in_date,
          checkOut: conflicts[0].reservations.check_out_date,
        },
      };
    }
  }

  // 6. Calcular costo adicional
  let additionalCost = 0;
  const roomCount = reservation.reservation_rooms.length;

  for (const rr of reservation.reservation_rooms) {
    const pricePerNight = parseFloat(rr.rooms.base_price);
    additionalCost += pricePerNight * additionalNights;
  }

  // Calcular precio promedio por noche (para habitaciones múltiples)
  const avgPricePerNight = additionalCost / (additionalNights * roomCount);

  return {
    available: true,
    additionalNights,
    roomCount,
    pricePerNight: avgPricePerNight,
    additionalCost,
    newCheckOutDate: newCheckOut,
    currentCheckOutDate: currentCheckOut,
    rooms: reservation.reservation_rooms.map(rr => ({
      room_number: rr.rooms.room_number,
      type: rr.rooms.room_types.name,
      pricePerNight: rr.rooms.base_price,
    })),
  };
}

/**
 * Extender estadía de una reserva
 *
 * @param {number} reservationId - ID de la reserva
 * @param {string} newCheckOutDate - Nueva fecha de check-out (ISO string)
 * @param {number} userId - ID del usuario que realiza la extensión
 * @returns {Object} Reserva actualizada
 */
async function extendStay(reservationId, newCheckOutDate, userId) {
  // 1. Verificar disponibilidad primero
  const availabilityCheck = await checkExtensionAvailability(
    reservationId,
    newCheckOutDate
  );

  if (!availabilityCheck.available) {
    throw new Error(availabilityCheck.reason);
  }

  // 2. Extender la reserva dentro de una transacción
  const result = await prisma.$transaction(async (tx) => {
    const currentCheckOut = availabilityCheck.currentCheckOutDate;
    const newCheckOut = availabilityCheck.newCheckOutDate;
    const additionalCost = Math.round(availabilityCheck.additionalCost || 0);

    if (!additionalCost || additionalCost === 0) {
      throw new Error('No se pudo calcular el costo adicional de la extensión');
    }

    // 2.1 Actualizar la reserva
    const updatedReservation = await tx.reservations.update({
      where: { id: reservationId },
      data: {
        check_out_date: newCheckOut,
        total_amount: {
          increment: additionalCost,
        },
      },
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
        users_reservations_main_guest_idTousers: {
          select: {
            id: true,
            first_name: true,
            paternal_last_name: true,
          },
        },
      },
    });

    // 2.2 Actualizar todas las reservation_rooms con la nueva fecha
    await tx.reservation_rooms.updateMany({
      where: {
        reservation_id: reservationId,
      },
      data: {
        end_date: newCheckOut,
      },
    });

    // 2.3 Recalcular el subtotal de cada habitación
    for (const rr of updatedReservation.reservation_rooms) {
      const totalNights = Math.ceil(
        (newCheckOut.getTime() - new Date(updatedReservation.check_in_date).getTime()) /
        (1000 * 60 * 60 * 24)
      );
      const newSubtotal = parseFloat(rr.rooms.base_price) * totalNights;

      await tx.reservation_rooms.update({
        where: { id: rr.id },
        data: {
          subtotal: newSubtotal,
        },
      });
    }

    // 2.4 Registrar en activity_logs
    await tx.activity_logs.create({
      data: {
        user_id: userId,
        action: 'UPDATE_RESERVATION',
        affected_table: 'reservations',
        record_id: reservationId,
        details: JSON.stringify({
          change_type: 'extend_stay',
          previousCheckOut: currentCheckOut,
          newCheckOut: newCheckOut,
          additionalNights: availabilityCheck.additionalNights,
          additionalCost,
        }),
      },
    });

    return updatedReservation;
  });

  return result;
}

module.exports = {
  checkExtensionAvailability,
  extendStay,
};
