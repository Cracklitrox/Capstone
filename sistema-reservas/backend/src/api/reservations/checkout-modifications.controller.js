import checkoutModificationsService from './checkout-modifications.service.js';
import { logError } from '../../utils/errorLogger.js';

/**
 * Realizar early checkout
 * POST /api/v1/reservations/:id/early-checkout
 */
async function earlyCheckout(req, res) {
  try {
    const { id } = req.params;
    const {
      reason,
      checkoutDateTime,
      daysUsed,
      unusedDays,
      adjustmentAmount,
      newTotal,
      chargesCurrentDay,
    } = req.body;
    const userId = req.user.id;
    const userRole = req.user.user_roles?.[0]?.roles?.name;

    if (!reason) {
      return res.status(400).json({
        message: 'La razón del early checkout es requerida',
      });
    }

    if (!checkoutDateTime) {
      return res.status(400).json({
        message: 'La fecha y hora de checkout son requeridas',
      });
    }

    const reservation = await checkoutModificationsService.earlyCheckout(
      parseInt(id),
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
    );

    return res.status(200).json({
      message: 'Early checkout realizado exitosamente',
      reservation,
    });
  } catch (error) {

    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
      description: `Error al realizar early checkout: ${error.message}`,
      originModule: 'checkout-modifications.controller - earlyCheckout',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      message: error.message || 'Error al realizar early checkout',
    });
  }
}

/**
 * Realizar late checkout
 * POST /api/v1/reservations/:id/late-checkout
 */
async function lateCheckout(req, res) {
  try {
    const { id } = req.params;
    const { reason, chargeAmount } = req.body;
    const userId = req.user.id;

    if (!reason) {
      return res.status(400).json({
        message: 'La razón del late checkout es requerida',
      });
    }

    const reservation = await checkoutModificationsService.lateCheckout(
      parseInt(id),
      {
        reason,
        chargeAmount: chargeAmount ? parseFloat(chargeAmount) : 0,
        userId,
      }
    );

    return res.status(200).json({
      message: 'Late checkout autorizado exitosamente',
      reservation,
    });
  } catch (error) {

    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
      description: `Error al realizar late checkout: ${error.message}`,
      originModule: 'checkout-modifications.controller - lateCheckout',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      message: error.message || 'Error al realizar late checkout',
    });
  }
}

export default {
  earlyCheckout,
  lateCheckout,
};
