import prisma from '../../db/prisma.client.js';
import pricingHelpersModule from './pricing.helpers.js';

const { calculateFirstDayPrice } = pricingHelpersModule;

/**
 * MATRIZ DE TRANSICIONES VÁLIDAS
 * Define qué cambios de estado son permitidos
 */
const VALID_TRANSITIONS = {
  pending: ['confirmed', 'canceled'],
  confirmed: ['ready_for_checkin', 'canceled'],
  ready_for_checkin: ['in_progress', 'no_show', 'canceled'],
  in_progress: ['pending_checkout', 'canceled'],
  pending_checkout: ['completed', 'in_progress'], // in_progress = extensión
  completed: [],
  canceled: [],
  no_show: []
};

/**
 * MAPEO DE ACCIONES DE ESTADO DE HABITACIONES
 * Define cómo cambiar el estado de las habitaciones según el estado de la reserva
 */
const ROOM_STATUS_ACTIONS = {
  confirmed: 'pending',        // Reserva confirmada → habitación pendiente
  ready_for_checkin: 'pending',// Listo para check-in → sigue pendiente
  in_progress: 'occupied',     // Check-in realizado → habitación ocupada
  pending_checkout: 'occupied',// Esperando check-out → sigue ocupada
  completed: 'cleaning',       // Check-out realizado → habitación en limpieza
  canceled: 'available',       // Cancelado → habitación disponible
  no_show: 'available'         // No llegó → habitación disponible
};

/**
 * Obtener configuración del sistema
 */
async function getSystemSetting(key) {
  const setting = await prisma.system_settings.findUnique({
    where: { setting_key: key }
  });

  if (!setting) {
    throw new Error(`Configuración del sistema no encontrada: ${key}`);
  }

  return setting.setting_value;
}

/**
 * Validar si una transición es válida
 */
function isValidTransition(currentStatus, newStatus) {
  const allowedTransitions = VALID_TRANSITIONS[currentStatus];

  if (!allowedTransitions) {
    throw new Error(`Estado actual inválido: ${currentStatus}`);
  }

  return allowedTransitions.includes(newStatus);
}

/**
 * Registrar cambio en reservation_history
 */
async function recordHistoryChange(tx, {
  reservationId,
  changeType,
  fieldChanged = 'status',
  oldValue,
  newValue,
  changedByUserId,
  changeReason,
  metadata = null
}) {
  await tx.reservation_history.create({
    data: {
      reservation_id: reservationId,
      change_type: changeType,
      field_changed: fieldChanged,
      old_value: oldValue,
      new_value: newValue,
      changed_by_user_id: changedByUserId,
      change_reason: changeReason,
      metadata: metadata
    }
  });
}

/**
 * Crear activity log
 */
async function createActivityLog(tx, {
  userId,
  userRole,
  action,
  recordId,
  details
}) {
  await tx.activity_logs.create({
    data: {
      user_id: userId,
      user_role: userRole,
      action: action,
      affected_table: 'reservations',
      record_id: recordId,
      details: details ? JSON.stringify(details) : null
    }
  });
}

/**
 * Actualizar estado de habitaciones de una reserva
 */
async function updateRoomStatuses(tx, reservationId, newRoomStatus) {
  // Obtener IDs de habitaciones de la reserva
  const reservationRooms = await tx.reservation_rooms.findMany({
    where: {
      reservation_id: reservationId,
      deleted_at: null
    },
    select: { room_id: true }
  });

  const roomIds = reservationRooms.map(rr => rr.room_id);

  if (roomIds.length === 0) {
    return;
  }

  // Actualizar estado de todas las habitaciones
  await tx.rooms.updateMany({
    where: { id: { in: roomIds } },
    data: { status: newRoomStatus }
  });

  return roomIds;
}

/**
 * VALIDACIÓN: Verificar pago antes de confirmar
 * NUEVA LÓGICA: Valida que se haya pagado el primer día completo
 */
async function validatePaymentForConfirmation(tx, reservationId) {
  const reservation = await tx.reservations.findUnique({
    where: { id: reservationId },
    include: {
      payments: {
        where: { deleted_at: null }
      }
    }
  });

  if (!reservation) {
    throw new Error('Reserva no encontrada');
  }

  // Verificar que haya al menos un pago confirmado
  const confirmedPayments = reservation.payments.filter(p => p.status === 'confirmed');

  if (confirmedPayments.length === 0) {
    throw new Error('No hay pagos confirmados para esta reserva');
  }

  const totalPaid = confirmedPayments.reduce((sum, p) => sum + p.amount, 0);

  // NUEVA LÓGICA: Calcular precio del primer día completo
  const firstDayPricing = await calculateFirstDayPrice(reservationId);
  const minRequired = firstDayPricing.firstDayTotal;

  if (totalPaid < minRequired) {
    throw new Error(
      `Pago insuficiente. Se requiere el pago completo del primer día ($${minRequired.toLocaleString('es-CL')}). Pagado: $${totalPaid.toLocaleString('es-CL')}`
    );
  }

  return totalPaid;
}

/**
 * VALIDACIÓN: Verificar pago antes de check-in
 * NUEVA LÓGICA: NO se requiere pago completo al check-in
 * Solo verificamos que haya al menos el primer día pagado (ya validado al confirmar)
 */
async function validatePaymentForCheckIn(tx, reservationId) {
  // NO validar pago completo al check-in
  // El pago completo se exige al check-out
  // Aquí solo verificamos que la reserva esté confirmed (lo cual implica que ya pagó el primer día)

  return true;
}

/**
 * VALIDACIÓN: Verificar saldo antes de check-out
 */
async function validatePaymentForCheckOut(tx, reservationId) {
  const reservation = await tx.reservations.findUnique({
    where: { id: reservationId },
    select: {
      total_amount: true,
      paid_amount: true
    }
  });

  if (reservation.paid_amount < reservation.total_amount) {
    const pending = reservation.total_amount - reservation.paid_amount;
    throw new Error(
      `No se puede completar check-out con saldo pendiente: $${pending}`
    );
  }

  return true;
}

/**
 * ACCIÓN: Al confirmar reserva
 */
async function onConfirmed(tx, reservation, userId, userRole) {
  const totalPaid = await validatePaymentForConfirmation(tx, reservation.id);

  // Actualizar paid_amount en la reserva
  await tx.reservations.update({
    where: { id: reservation.id },
    data: { paid_amount: totalPaid }
  });

  // Actualizar habitaciones a 'pending'
  await updateRoomStatuses(tx, reservation.id, 'pending');

  return {
    message: 'Reserva confirmada exitosamente',
    totalPaid
  };
}

/**
 * ACCIÓN: Al marcar ready_for_checkin (automático a las 11:00 del día)
 */
async function onReadyForCheckIn(tx, reservation, userId, userRole) {
  // Las habitaciones siguen en estado 'pending'
  // Solo cambiamos el estado de la reserva

  return {
    message: 'Reserva lista para check-in'
  };
}

/**
 * ACCIÓN: Al hacer check-in
 */
async function onInProgress(tx, reservation, userId, userRole) {
  // Validar pago si está configurado
  await validatePaymentForCheckIn(tx, reservation.id);

  // Actualizar habitaciones a 'occupied'
  const roomIds = await updateRoomStatuses(tx, reservation.id, 'occupied');

  return {
    message: 'Check-in realizado exitosamente',
    roomsOccupied: roomIds?.length || 0
  };
}

/**
 * ACCIÓN: Al marcar pending_checkout (automático a las 09:00 del día)
 */
async function onPendingCheckOut(tx, reservation, userId, userRole) {
  // Las habitaciones siguen 'occupied'
  // Solo marcamos que debe hacer check-out

  return {
    message: 'Reserva marcada para check-out'
  };
}

/**
 * ACCIÓN: Al completar check-out
 *
 * ✅ CORREGIDO: Las habitaciones quedan en 'occupied' después del check-out
 * El cambio a 'cleaning' debe ser MANUAL por parte del recepcionista/administrador
 * Flujo: check-out → occupied → [manual trigger] → cleaning → available
 */
async function onCompleted(tx, reservation, userId, userRole) {
  // Validar que no haya saldo pendiente
  await validatePaymentForCheckOut(tx, reservation.id);

  // Las habitaciones permanecen en estado 'occupied' después del check-out
  // El staff debe manualmente enviarlas a limpieza cuando corresponda

  return {
    message: 'Check-out completado exitosamente. Las habitaciones quedan disponibles para limpieza.',
  };
}

/**
 * ACCIÓN: Al cancelar reserva
 */
async function onCanceled(tx, reservation, userId, userRole, reason) {
  // Liberar habitaciones
  await updateRoomStatuses(tx, reservation.id, 'available');

  // TODO: Calcular reembolso según política de cancelación
  // (Esto se implementará en TAREA 6.3)

  return {
    message: 'Reserva cancelada exitosamente',
    reason: reason
  };
}

/**
 * ACCIÓN: Al marcar no-show
 */
async function onNoShow(tx, reservation, userId, userRole) {
  // Liberar habitaciones
  await updateRoomStatuses(tx, reservation.id, 'available');

  return {
    message: 'Reserva marcada como no-show'
  };
}

/**
 * FUNCIÓN PRINCIPAL: Cambiar estado de reserva
 */
async function changeReservationStatus({
  reservationId,
  newStatus,
  userId,
  userRole,
  reason = null,
  metadata = null
}) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener reserva actual
      const reservation = await tx.reservations.findUnique({
        where: { id: reservationId },
        include: {
          reservation_rooms: {
            where: { deleted_at: null },
            include: { rooms: true }
          },
          payments: {
            where: { deleted_at: null }
          }
        }
      });

      if (!reservation) {
        throw new Error('Reserva no encontrada');
      }

      const currentStatus = reservation.status;

      // 2. Validar que la transición sea válida
      if (!isValidTransition(currentStatus, newStatus)) {
        throw new Error(
          `Transición inválida: ${currentStatus} → ${newStatus}. ` +
          `Transiciones permitidas desde ${currentStatus}: ${VALID_TRANSITIONS[currentStatus].join(', ')}`
        );
      }

      // 3. Ejecutar validaciones específicas y acciones según nuevo estado
      let actionResult = {};

      switch (newStatus) {
        case 'confirmed':
          actionResult = await onConfirmed(tx, reservation, userId, userRole);
          break;
        case 'ready_for_checkin':
          actionResult = await onReadyForCheckIn(tx, reservation, userId, userRole);
          break;
        case 'in_progress':
          actionResult = await onInProgress(tx, reservation, userId, userRole);
          break;
        case 'pending_checkout':
          actionResult = await onPendingCheckOut(tx, reservation, userId, userRole);
          break;
        case 'completed':
          actionResult = await onCompleted(tx, reservation, userId, userRole);
          break;
        case 'canceled':
          actionResult = await onCanceled(tx, reservation, userId, userRole, reason);
          break;
        case 'no_show':
          actionResult = await onNoShow(tx, reservation, userId, userRole);
          break;
      }

      // 4. Actualizar estado de la reserva
      const updatedReservation = await tx.reservations.update({
        where: { id: reservationId },
        data: { status: newStatus }
      });

      // 5. Registrar cambio en reservation_history
      await recordHistoryChange(tx, {
        reservationId,
        changeType: 'status_change',
        fieldChanged: 'status',
        oldValue: currentStatus,
        newValue: newStatus,
        changedByUserId: userId,
        changeReason: reason,
        metadata: metadata
      });

      // 6. Crear activity log
      await createActivityLog(tx, {
        userId,
        userRole,
        action: newStatus === 'in_progress' ? 'CHECK_IN' :
                newStatus === 'completed' ? 'CHECK_OUT' :
                newStatus === 'canceled' ? 'CANCEL_RESERVATION' :
                'UPDATE_RESERVATION',
        recordId: reservationId,
        details: {
          oldStatus: currentStatus,
          newStatus: newStatus,
          reason: reason,
          ...actionResult
        }
      });

      return {
        success: true,
        reservation: updatedReservation,
        previousStatus: currentStatus,
        newStatus: newStatus,
        ...actionResult
      };
    });

    return result;

  } catch (error) {
    throw error;
  }
}

/**
 * Obtener transiciones válidas para un estado
 */
function getValidTransitions(currentStatus) {
  return VALID_TRANSITIONS[currentStatus] || [];
}

/**
 * Obtener historial de cambios de una reserva
 */
async function getReservationHistory(reservationId) {
  const history = await prisma.reservation_history.findMany({
    where: { reservation_id: reservationId },
    include: {
      changed_by_user: {
        select: {
          id: true,
          first_name: true,
          paternal_last_name: true,
          maternal_last_name: true,
          user_roles: {
            select: {
              roles: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });

  return history;
}

export default {
  changeReservationStatus,
  getValidTransitions,
  getReservationHistory,
  VALID_TRANSITIONS,
  ROOM_STATUS_ACTIONS
};
