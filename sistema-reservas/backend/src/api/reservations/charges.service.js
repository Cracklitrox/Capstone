const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Agregar un cargo manual a una reserva
 *
 * @param {number} reservationId - ID de la reserva
 * @param {string} chargeType - Tipo de cargo (minibar|room_damage|extra_service|penalty|other)
 * @param {string} description - Descripción del cargo
 * @param {number} amount - Monto del cargo
 * @param {number} quantity - Cantidad (default: 1)
 * @param {number} roomId - ID de habitación (opcional)
 * @param {number} chargedById - ID del usuario que registra el cargo
 * @returns {Object} Cargo creado
 */
async function addManualCharge(reservationId, {
  chargeType,
  description,
  amount,
  quantity = 1,
  roomId = null,
  chargedById
}) {
  // Validar que la reserva existe
  const reservation = await prisma.reservations.findUnique({
    where: { id: reservationId },
  });

  if (!reservation) {
    throw new Error('Reserva no encontrada');
  }

  // Validar que la reserva esté en un estado que permita agregar cargos
  const validStatuses = ['in_progress', 'pending_checkout'];
  if (!validStatuses.includes(reservation.status)) {
    throw new Error(
      `No se pueden agregar cargos a reservas con estado "${reservation.status}". ` +
      'Solo se permiten cargos en reservas "in_progress" o "pending_checkout".'
    );
  }

  // Validar tipo de cargo
  const validChargeTypes = ['minibar', 'room_damage', 'extra_service', 'penalty', 'other'];
  if (!validChargeTypes.includes(chargeType)) {
    throw new Error(
      `Tipo de cargo inválido. Debe ser uno de: ${validChargeTypes.join(', ')}`
    );
  }

  // Validar monto
  if (!amount || amount <= 0) {
    throw new Error('El monto debe ser mayor a 0');
  }

  // Validar cantidad
  if (!quantity || quantity < 1) {
    throw new Error('La cantidad debe ser al menos 1');
  }

  // Validar descripción (obligatorio si tipo es "other")
  if (chargeType === 'other' && (!description || description.trim() === '')) {
    throw new Error('La descripción es obligatoria para cargos de tipo "other"');
  }

  // Calcular subtotal
  const subtotal = amount * quantity;

  // Crear el cargo dentro de una transacción
  const result = await prisma.$transaction(async (tx) => {
    // 1. Crear el cargo
    const charge = await tx.additional_charges.create({
      data: {
        reservation_id: reservationId,
        room_id: roomId,
        charge_type: chargeType,
        description: description || getDefaultDescription(chargeType),
        amount,
        quantity,
        subtotal,
        charged_by_id: chargedById,
      },
      include: {
        rooms: {
          select: {
            room_number: true,
            room_types: {
              select: {
                name: true,
              },
            },
          },
        },
        charged_by: {
          select: {
            id: true,
            first_name: true,
            paternal_last_name: true,
          },
        },
      },
    });

    // 2. Actualizar el total de la reserva
    const currentReservation = await tx.reservations.findUnique({
      where: { id: reservationId },
      select: { total_amount: true },
    });

    await tx.reservations.update({
      where: { id: reservationId },
      data: {
        total_amount: parseFloat(currentReservation.total_amount) + subtotal,
      },
    });

    // 3. Registrar en activity_logs
    await tx.activity_logs.create({
      data: {
        user_id: chargedById,
        action: 'UPDATE_RESERVATION',
        affected_table: 'additional_charges',
        record_id: charge.id,
        details: JSON.stringify({
          reservation_id: reservationId,
          chargeType,
          amount,
          quantity,
          subtotal,
          description: charge.description,
          roomId,
        }),
      },
    });

    return charge;
  });

  return result;
}

/**
 * Obtener todos los cargos manuales de una reserva
 *
 * @param {number} reservationId - ID de la reserva
 * @returns {Array} Lista de cargos
 */
async function getManualCharges(reservationId) {
  const charges = await prisma.additional_charges.findMany({
    where: {
      reservation_id: reservationId,
      deleted_at: null,
    },
    include: {
      rooms: {
        select: {
          room_number: true,
          room_types: {
            select: {
              name: true,
            },
          },
        },
      },
      charged_by: {
        select: {
          id: true,
          first_name: true,
          paternal_last_name: true,
        },
      },
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  return charges;
}

/**
 * Eliminar un cargo manual (soft delete)
 *
 * @param {number} chargeId - ID del cargo
 * @param {number} userId - ID del usuario que elimina
 * @returns {Object} Cargo eliminado
 */
async function removeManualCharge(chargeId, userId) {
  const charge = await prisma.additional_charges.findUnique({
    where: { id: chargeId },
    include: {
      reservations: {
        select: {
          id: true,
          status: true,
          total_amount: true,
        },
      },
    },
  });

  if (!charge) {
    throw new Error('Cargo no encontrado');
  }

  if (charge.deleted_at) {
    throw new Error('El cargo ya fue eliminado');
  }

  // Validar que la reserva esté en un estado que permita eliminar cargos
  const validStatuses = ['in_progress', 'pending_checkout'];
  if (!validStatuses.includes(charge.reservations.status)) {
    throw new Error(
      'No se pueden eliminar cargos de reservas con estado diferente a "in_progress" o "pending_checkout"'
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Soft delete del cargo
    const deletedCharge = await tx.additional_charges.update({
      where: { id: chargeId },
      data: {
        deleted_at: new Date(),
      },
    });

    // 2. Actualizar el total de la reserva (restar el subtotal)
    await tx.reservations.update({
      where: { id: charge.reservation_id },
      data: {
        total_amount: parseFloat(charge.reservations.total_amount) - charge.subtotal,
      },
    });

    // 3. Registrar en activity_logs (usando UPDATE_PAYMENT ya que es cambio en monto de reserva)
    await tx.activity_logs.create({
      data: {
        user_id: userId,
        action: 'UPDATE_PAYMENT',
        affected_table: 'additional_charges',
        record_id: chargeId,
        details: JSON.stringify({
          reservation_id: charge.reservation_id,
          chargeType: charge.charge_type,
          subtotal: charge.subtotal,
          action_performed: 'delete_charge',
        }),
      },
    });

    return deletedCharge;
  });

  return result;
}

// ============================================
// Utilidades
// ============================================

/**
 * Obtener descripción por defecto según tipo de cargo
 */
function getDefaultDescription(chargeType) {
  const descriptions = {
    minibar: 'Consumo de minibar',
    room_damage: 'Daño a la habitación',
    extra_service: 'Servicio adicional',
    penalty: 'Penalización',
    other: 'Cargo adicional',
  };

  return descriptions[chargeType] || 'Cargo adicional';
}

/**
 * Obtener label en español para tipo de cargo
 */
function getChargeTypeLabel(chargeType) {
  const labels = {
    minibar: 'Minibar',
    room_damage: 'Daño a habitación',
    extra_service: 'Servicio adicional',
    penalty: 'Penalización',
    other: 'Otro',
  };

  return labels[chargeType] || 'Cargo';
}

/**
 * Formatear monto en pesos chilenos
 */
function formatCLP(amount) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount);
}

module.exports = {
  addManualCharge,
  getManualCharges,
  removeManualCharge,
};
