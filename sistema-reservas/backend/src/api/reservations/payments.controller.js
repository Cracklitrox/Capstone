const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { logError } = require("../../utils/errorLogger");

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
    console.error('Error al confirmar pago:', error);

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
    const { reservationId } = req.params;

    const payments = await prisma.payments.findMany({
      where: {
        reservation_id: parseInt(reservationId),
        deleted_at: null
      },
      orderBy: { created_at: 'desc' }
    });

    const reservation = await prisma.reservations.findUnique({
      where: { id: parseInt(reservationId) },
      select: {
        total_amount: true,
        paid_amount: true
      }
    });

    return res.status(200).json({
      reservationId: parseInt(reservationId),
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
        createdAt: p.created_at
      }))
    });

  } catch (error) {
    console.error('Error al obtener pagos:', error);

    return res.status(500).json({
      message: 'Error al obtener pagos de la reserva'
    });
  }
}

module.exports = {
  confirmPayment,
  getReservationPayments
};
