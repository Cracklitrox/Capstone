import prisma from '../../db/prisma.client.js';
import { logError } from '../../utils/errorLogger.js';

/**
 * Confirmar un pago pendiente
 */
async function confirmPayment(req, res) {
  try {
    const { paymentId } = req.params;
    const { transactionId, notes } = req.body;
    const userId = req.user.id;
    const userRole = req.user.user_roles[0]?.roles.name;

    // Obtener el pago
    const payment = await prisma.payments.findUnique({
      where: { id: parseInt(paymentId) },
      include: {
        reservations: {
          select: {
            id: true,
            code: true,
            status: true,
            total_amount: true,
            paid_amount: true
          }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({
        message: 'Pago no encontrado'
      });
    }

    if (payment.status === 'confirmed') {
      return res.status(400).json({
        message: 'El pago ya está confirmado'
      });
    }

    // Actualizar el pago
    const updatedPayment = await prisma.$transaction(async (tx) => {
      // 1. Confirmar el pago
      const confirmed = await tx.payments.update({
        where: { id: parseInt(paymentId) },
        data: {
          status: 'confirmed',
          transaction_id: transactionId,
          notes: notes
        }
      });

      // 2. Actualizar paid_amount en la reserva
      const allPayments = await tx.payments.findMany({
        where: {
          reservation_id: payment.reservation_id,
          status: 'confirmed',
          deleted_at: null
        }
      });

      const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

      const updatedReservation = await tx.reservations.update({
        where: { id: payment.reservation_id },
        data: { paid_amount: totalPaid }
      });

      // 3. Activity log
      await tx.activity_logs.create({
        data: {
          user_id: userId,
          user_role: userRole,
          action: 'UPDATE_PAYMENT',
          affected_table: 'payments',
          record_id: parseInt(paymentId),
          details: JSON.stringify({
            paymentId: parseInt(paymentId),
            reservationId: payment.reservation_id,
            amount: payment.amount,
            method: payment.payment_method,
            totalPaid
          })
        }
      });

      return { payment: confirmed, reservation: updatedReservation };
    });

    return res.status(200).json({
      message: 'Pago confirmado exitosamente',
      payment: {
        id: updatedPayment.payment.id,
        amount: updatedPayment.payment.amount,
        status: updatedPayment.payment.status,
        method: updatedPayment.payment.payment_method,
        transactionId: updatedPayment.payment.transaction_id
      },
      reservation: {
        id: updatedPayment.reservation.id,
        paid_amount: updatedPayment.reservation.paid_amount,
        total_amount: updatedPayment.reservation.total_amount
      }
    });

  } catch (error) {

    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
      description: `Error al confirmar pago: ${error.message}`,
      originModule: 'payments.controller - confirmPayment',
      severity: 'high',
      errorObject: error
    });

    return res.status(500).json({
      message: 'Error al confirmar pago',
      error: error.message
    });
  }
}

/**
 * Obtener pagos de una reserva
 */
async function getReservationPayments(req, res) {
  try {
    const reservationId = parseInt(req.params.id);

    const payments = await prisma.payments.findMany({
      where: {
        reservation_id: reservationId,
        deleted_at: null
      },
      orderBy: { created_at: 'desc' }
    });

    const reservation = await prisma.reservations.findUnique({
      where: { id: reservationId },
      select: {
        total_amount: true,
        paid_amount: true
      }
    });

    // Consultar alertas pendientes de anulación para estos pagos
    // NOTA: payment_id y action_type no existen en el modelo alerts, se deben buscar en full_summary o filtrar por reservation_id
    const pendingAnnulmentAlerts = await prisma.alerts.findMany({
      where: {
        reservation_id: reservationId,
        type: 'payment',
        status: 'pending'
      },
      select: {
        id: true,
        created_at: true,
        full_summary: true
      }
    });

    // Crear un mapa de payment_id -> tiene alerta pendiente
    const alertsMap = new Map();
    pendingAnnulmentAlerts.forEach(alert => {
      // Verificar si la alerta es de tipo anulación y corresponde a uno de los pagos
      const summary = alert.full_summary;
      if (summary && summary.action_type === 'approve_annulment' && summary.payment_id) {
        alertsMap.set(summary.payment_id, {
          alertId: alert.id,
          requestedAt: alert.created_at
        });
      }
    });

    return res.status(200).json({
      reservationId: reservationId,
      totalAmount: reservation.total_amount,
      paidAmount: reservation.paid_amount,
      pendingAmount: reservation.total_amount - reservation.paid_amount,
      payments: payments.map(p => ({
        id: p.id,
        amount: p.amount,
        method: p.payment_method,
        paymentType: p.payment_type,
        status: p.status,
        isDeposit: p.is_deposit,
        transactionId: p.transaction_id,
        notes: p.notes,
        paymentSequence: p.payment_sequence,
        createdAt: p.created_at,
        hasPendingAnnulmentRequest: alertsMap.has(p.id),
        annulmentRequestInfo: alertsMap.get(p.id) || null
      }))
    });

  } catch (error) {

    return res.status(500).json({
      message: 'Error al obtener pagos de la reserva'
    });
  }
}

/**
 * Registrar un nuevo pago
 */
async function registerPayment(req, res) {
  try {
    const reservationId = parseInt(req.params.id);
    const { amount, payment_method, is_deposit, notes, transaction_id, confirm_immediately } = req.body;
    const userId = req.user.id;
    const userRole = req.user.user_roles[0]?.roles.name;

    // Validaciones básicas
    if (!amount || amount <= 0) {
      return res.status(400).json({
        message: 'El monto debe ser mayor a 0'
      });
    }

    if (!payment_method) {
      return res.status(400).json({
        message: 'Debe especificar un método de pago'
      });
    }

    // Obtener la reserva
    const reservation = await prisma.reservations.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        code: true,
        status: true,
        total_amount: true,
        paid_amount: true
      }
    });

    if (!reservation) {
      return res.status(404).json({
        message: 'Reserva no encontrada'
      });
    }

    // Validar que no se exceda el total
    const pendingAmount = reservation.total_amount - reservation.paid_amount;
    if (amount > pendingAmount) {
      return res.status(400).json({
        message: `El monto excede el saldo pendiente ($${pendingAmount})`
      });
    }

    // Obtener el siguiente payment_sequence
    const lastPayment = await prisma.payments.findFirst({
      where: { reservation_id: reservationId },
      orderBy: { payment_sequence: 'desc' },
      select: { payment_sequence: true }
    });

    const paymentSequence = (lastPayment?.payment_sequence || 0) + 1;

    // Determinar estado:
    // - cash: siempre confirmado automáticamente
    // - otros: confirmado solo si confirm_immediately = true, sino pending
    const status = payment_method === 'cash' || confirm_immediately ? 'confirmed' : 'pending';

    // Crear el pago
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear el pago
      const newPayment = await tx.payments.create({
        data: {
          reservation_id: reservationId,
          amount: parseInt(amount),
          payment_method,
          is_deposit: is_deposit || false,
          payment_sequence: paymentSequence,
          status,
          transaction_id,
          notes
        }
      });

      // 2. Si el pago es confirmado, actualizar paid_amount
      if (status === 'confirmed') {
        const allConfirmedPayments = await tx.payments.findMany({
          where: {
            reservation_id: reservationId,
            status: 'confirmed',
            deleted_at: null
          }
        });

        const totalPaid = allConfirmedPayments.reduce((sum, p) => sum + p.amount, 0);

        await tx.reservations.update({
          where: { id: reservationId },
          data: { paid_amount: totalPaid }
        });
      }

      // 3. Activity log
      await tx.activity_logs.create({
        data: {
          user_id: userId,
          user_role: userRole,
          action: 'CREATE_PAYMENT',
          affected_table: 'payments',
          record_id: newPayment.id,
          details: JSON.stringify({
            reservationId: reservationId,
            amount,
            payment_method,
            status,
            is_deposit
          })
        }
      });

      return newPayment;
    });

    return res.status(201).json({
      message: 'Pago registrado exitosamente',
      payment: {
        id: result.id,
        amount: result.amount,
        payment_method: result.payment_method,
        status: result.status,
        is_deposit: result.is_deposit,
        payment_sequence: result.payment_sequence
      }
    });

  } catch (error) {

    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
      description: `Error al registrar pago: ${error.message}`,
      originModule: 'payments.controller - registerPayment',
      severity: 'high',
      errorObject: error
    });

    return res.status(500).json({
      message: 'Error al registrar pago',
      error: error.message
    });
  }
}

/**
 * Rechazar un pago pendiente
 */
async function rejectPayment(req, res) {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    const userRole = req.user.user_roles[0]?.roles.name;

    const payment = await prisma.payments.findUnique({
      where: { id: parseInt(paymentId) }
    });

    if (!payment) {
      return res.status(404).json({
        message: 'Pago no encontrado'
      });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({
        message: 'Solo se pueden rechazar pagos pendientes'
      });
    }

    const updatedPayment = await prisma.$transaction(async (tx) => {
      // 1. Cambiar estado a rejected
      const rejected = await tx.payments.update({
        where: { id: parseInt(paymentId) },
        data: {
          status: 'rejected',
          notes: reason ? `${payment.notes || ''}\nRechazado: ${reason}`.trim() : payment.notes
        }
      });

      // 2. Activity log
      await tx.activity_logs.create({
        data: {
          user_id: userId,
          user_role: userRole,
          action: 'REJECT_PAYMENT',
          affected_table: 'payments',
          record_id: parseInt(paymentId),
          details: JSON.stringify({
            paymentId: parseInt(paymentId),
            reservationId: payment.reservation_id,
            amount: payment.amount,
            reason
          })
        }
      });

      return rejected;
    });

    return res.status(200).json({
      message: 'Pago rechazado exitosamente',
      payment: updatedPayment
    });

  } catch (error) {

    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
      description: `Error al rechazar pago: ${error.message}`,
      originModule: 'payments.controller - rejectPayment',
      severity: 'high',
      errorObject: error
    });

    return res.status(500).json({
      message: 'Error al rechazar pago',
      error: error.message
    });
  }
}

/**
 * Anular un pago confirmado (solo admin)
 */
async function annulPayment(req, res) {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    const userRole = req.user.user_roles[0]?.roles.name;

    // Verificar que sea administrador
    if (userRole !== 'administrator') {
      return res.status(403).json({
        message: 'Solo los administradores pueden anular pagos confirmados'
      });
    }

    const payment = await prisma.payments.findUnique({
      where: { id: parseInt(paymentId) }
    });

    if (!payment) {
      return res.status(404).json({
        message: 'Pago no encontrado'
      });
    }

    if (payment.status !== 'confirmed') {
      return res.status(400).json({
        message: 'Solo se pueden anular pagos confirmados'
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Hacer soft delete del pago
      const annulled = await tx.payments.update({
        where: { id: parseInt(paymentId) },
        data: {
          deleted_at: new Date(),
          notes: reason ? `${payment.notes || ''}\nAnulado: ${reason}`.trim() : payment.notes
        }
      });

      // 2. Recalcular paid_amount de la reserva
      const allConfirmedPayments = await tx.payments.findMany({
        where: {
          reservation_id: payment.reservation_id,
          status: 'confirmed',
          deleted_at: null
        }
      });

      const totalPaid = allConfirmedPayments.reduce((sum, p) => sum + p.amount, 0);

      await tx.reservations.update({
        where: { id: payment.reservation_id },
        data: { paid_amount: totalPaid }
      });

      // 3. Activity log
      await tx.activity_logs.create({
        data: {
          user_id: userId,
          user_role: userRole,
          action: 'ANNUL_PAYMENT',
          affected_table: 'payments',
          record_id: parseInt(paymentId),
          details: JSON.stringify({
            paymentId: parseInt(paymentId),
            reservationId: payment.reservation_id,
            amount: payment.amount,
            reason
          })
        }
      });

      return { payment: annulled, newPaidAmount: totalPaid };
    });

    return res.status(200).json({
      message: 'Pago anulado exitosamente',
      payment: result.payment,
      newPaidAmount: result.newPaidAmount
    });

  } catch (error) {

    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
      description: `Error al anular pago: ${error.message}`,
      originModule: 'payments.controller - annulPayment',
      severity: 'high',
      errorObject: error
    });

    return res.status(500).json({
      message: 'Error al anular pago',
      error: error.message
    });
  }
}

/**
 * Reintentar un pago fallido
 */
async function retryPayment(req, res) {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.user_roles[0]?.roles.name;

    const payment = await prisma.payments.findUnique({
      where: { id: parseInt(paymentId) }
    });

    if (!payment) {
      return res.status(404).json({
        message: 'Pago no encontrado'
      });
    }

    if (payment.status !== 'failed') {
      return res.status(400).json({
        message: 'Solo se pueden reintentar pagos fallidos'
      });
    }

    const updatedPayment = await prisma.$transaction(async (tx) => {
      // 1. Cambiar estado a pending
      const retried = await tx.payments.update({
        where: { id: parseInt(paymentId) },
        data: {
          status: 'pending'
        }
      });

      // 2. Activity log
      await tx.activity_logs.create({
        data: {
          user_id: userId,
          user_role: userRole,
          action: 'RETRY_PAYMENT',
          affected_table: 'payments',
          record_id: parseInt(paymentId),
          details: JSON.stringify({
            paymentId: parseInt(paymentId),
            reservationId: payment.reservation_id,
            amount: payment.amount
          })
        }
      });

      return retried;
    });

    return res.status(200).json({
      message: 'Pago marcado como pendiente para reintento',
      payment: updatedPayment
    });

  } catch (error) {

    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
      description: `Error al reintentar pago: ${error.message}`,
      originModule: 'payments.controller - retryPayment',
      severity: 'high',
      errorObject: error
    });

    return res.status(500).json({
      message: 'Error al reintentar pago',
      error: error.message
    });
  }
}

/**
 * Solicitar anulación de pago (para recepcionistas)
 */
async function requestAnnulment(req, res) {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    const userRole = req.user.user_roles[0]?.roles.name;

    if (!reason) {
      return res.status(400).json({
        message: 'Debe proporcionar una razón para la solicitud'
      });
    }

    const payment = await prisma.payments.findUnique({
      where: { id: parseInt(paymentId) },
      include: {
        reservations: {
          select: {
            code: true,
            users_reservations_main_guest_idTousers: {
              select: {
                first_name: true,
                paternal_last_name: true
              }
            }
          }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({
        message: 'Pago no encontrado'
      });
    }

    // Crear alerta para administradores
    const guestName = payment.reservations.users_reservations_main_guest_idTousers
      ? `${payment.reservations.users_reservations_main_guest_idTousers.first_name} ${payment.reservations.users_reservations_main_guest_idTousers.paternal_last_name}`
      : 'Huésped';

    await prisma.alerts.create({
      data: {
        type: 'payment',
        priority: 'high',
        status: 'pending',
        title: 'Solicitud de Anulación de Pago',
        message: `El ${userRole} ${req.user.first_name} ${req.user.paternal_last_name} solicita anular un pago confirmado de $${payment.amount.toLocaleString('es-CL')} para la reserva ${payment.reservations.code} (${guestName}).

Razón detallada: ${reason}

Detalles del pago:
- Método: ${payment.method}
- Fecha: ${payment.created_at.toLocaleString('es-CL')}
- Estado actual: Confirmado`,
        target_role: 'administrator',
        origin_user_id: userId,
        reservation_id: payment.reservation_id,
        full_summary: {
          action_type: 'approve_annulment',
          payment_id: parseInt(paymentId),
          reason,
          amount: payment.amount
        }
      }
    });

    // Activity log
    await prisma.activity_logs.create({
      data: {
        user_id: userId,
        user_role: userRole,
        action: 'REQUEST_PAYMENT_ANNULMENT',
        affected_table: 'payments',
        record_id: parseInt(paymentId),
        details: JSON.stringify({
          paymentId: parseInt(paymentId),
          reservationId: payment.reservation_id,
          amount: payment.amount,
          reason
        })
      }
    });

    return res.status(200).json({
      message: 'Solicitud enviada al administrador exitosamente'
    });

  } catch (error) {

    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
      description: `Error al solicitar anulación: ${error.message}`,
      originModule: 'payments.controller - requestAnnulment',
      severity: 'medium',
      errorObject: error
    });

    return res.status(500).json({
      message: 'Error al solicitar anulación',
      error: error.message
    });
  }
}

export default {
  confirmPayment,
  getReservationPayments,
  registerPayment,
  rejectPayment,
  annulPayment,
  retryPayment,
  requestAnnulment
};
