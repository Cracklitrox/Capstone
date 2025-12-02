import prisma from '../../db/prisma.client.js';
import statusService from './status.service.js';

/**
 * Realizar early checkout (salida anticipada)
 *
 * @param {number} reservationId - ID de la reserva
 * @param {string} reason - Razón del early checkout
 * @param {string} checkoutDateTime - Fecha/hora exacta del checkout
 * @param {number} daysUsed - Días utilizados (calculado con política 09:00)
 * @param {number} unusedDays - Días no utilizados
 * @param {number} adjustmentAmount - Monto del ajuste (devolución)
 * @param {number} newTotal - Nuevo total de la reserva
 * @param {boolean} chargesCurrentDay - Si se cobra el día actual (política 09:00)
 * @param {number} userId - ID del usuario que realiza la acción
 * @returns {Object} Reserva actualizada
 */
async function earlyCheckout(
  reservationId,
  {
    reason,
    checkoutDateTime,
    daysUsed,
    unusedDays,
    adjustmentAmount,
    newTotal,
    chargesCurrentDay,
    userId,
    userRole,
  }
) {
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

  // 2. Validar que esté en estado in_progress
  if (reservation.status !== 'in_progress') {
    throw new Error(
      'Solo se puede realizar early checkout en reservas con estado "in_progress"'
    );
  }

  // 3. Usar los datos calculados del frontend (con política 09:00)
  const earlyCheckoutDate = new Date(checkoutDateTime);
  const originalCheckOut = new Date(reservation.check_out_date);
  const refundAmount = parseFloat(adjustmentAmount) || 0;

  // 4. Realizar el early checkout
  const result = await prisma.$transaction(async (tx) => {
    // 4.1 Actualizar la reserva con la fecha exacta y el nuevo total calculado
    await tx.reservations.update({
      where: { id: reservationId },
      data: {
        check_out_date: earlyCheckoutDate,
        total_amount: parseFloat(newTotal),
      },
    });

    // 4.2 Actualizar todas las reservation_rooms con la nueva fecha
    await tx.reservation_rooms.updateMany({
      where: {
        reservation_id: reservationId,
      },
      data: {
        end_date: earlyCheckoutDate,
      },
    });

    // 4.3 Recalcular el subtotal de cada habitación según días usados
    for (const rr of reservation.reservation_rooms) {
      const pricePerNight = parseFloat(rr.rooms.base_price || 0);
      const newSubtotal = Math.round(pricePerNight * daysUsed);

      if (!newSubtotal || newSubtotal === 0) {
        throw new Error(`No se pudo calcular el subtotal para habitación ${rr.id}`);
      }

      await tx.reservation_rooms.update({
        where: { id: rr.id },
        data: {
          subtotal: newSubtotal,
        },
      });
    }

    // 4.4 Cambiar el estado a pending_checkout
    await tx.reservations.update({
      where: { id: reservationId },
      data: {
        status: 'pending_checkout',
      },
    });

    // 4.5 Registrar en activity_logs con todos los detalles de la política
    await tx.activity_logs.create({
      data: {
        user_id: userId,
        action: 'UPDATE_RESERVATION',
        affected_table: 'reservations',
        record_id: reservationId,
        details: JSON.stringify({
          change_type: 'early_checkout',
          originalCheckOut: originalCheckOut,
          newCheckOut: earlyCheckoutDate,
          daysUsed,
          unusedDays,
          refundAmount,
          newTotal,
          chargesCurrentDay,
          policy: chargesCurrentDay
            ? 'Después de 09:00 - Se cobra día completo'
            : 'Antes de 09:00 - No se cobra día actual',
          reason,
        }),
      },
    });

    // 4.6 Retornar reserva actualizada
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
 * Realizar late checkout (salida tardía)
 *
 * @param {number} reservationId - ID de la reserva
 * @param {string} reason - Razón del late checkout
 * @param {number} chargeAmount - Monto del cargo por late checkout (opcional, default: 0)
 * @param {number} userId - ID del usuario que realiza la acción
 * @returns {Object} Reserva actualizada
 */
async function lateCheckout(reservationId, { reason, chargeAmount = 0, userId }) {
  // 1. Obtener la reserva
  const reservation = await prisma.reservations.findUnique({
    where: { id: reservationId },
  });

  if (!reservation) {
    throw new Error('Reserva no encontrada');
  }

  // 2. Validar que esté en estado pending_checkout
  if (reservation.status !== 'pending_checkout') {
    throw new Error(
      'Solo se puede realizar late checkout en reservas con estado "pending_checkout"'
    );
  }

  // 3. Validar el monto del cargo
  const charge = parseFloat(chargeAmount);
  if (charge < 0) {
    throw new Error('El monto del cargo no puede ser negativo');
  }

  // 4. Realizar el late checkout
  const result = await prisma.$transaction(async (tx) => {
    // 4.1 Si hay cargo, agregarlo como additional_charge
    if (charge > 0) {
      await tx.additional_charges.create({
        data: {
          reservation_id: reservationId,
          charge_type: 'penalty',
          description: `Late checkout - ${reason}`,
          amount: charge,
          quantity: 1,
          subtotal: charge,
          charged_by_id: userId,
        },
      });

      // Actualizar el total de la reserva
      await tx.reservations.update({
        where: { id: reservationId },
        data: {
          total_amount: {
            increment: charge,
          },
        },
      });
    }

    // 4.2 Registrar en activity_logs
    await tx.activity_logs.create({
      data: {
        user_id: userId,
        action: 'UPDATE_RESERVATION',
        affected_table: 'reservations',
        record_id: reservationId,
        details: JSON.stringify({
          change_type: 'late_checkout',
          charge,
          reason,
        }),
      },
    });

    // 4.3 Retornar reserva actualizada
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

export default {
  earlyCheckout,
  lateCheckout,
};
