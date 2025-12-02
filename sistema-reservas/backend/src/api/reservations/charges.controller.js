import chargesService from './charges.service.js';
import { logError } from '../../utils/errorLogger.js';

/**
 * Agregar un cargo manual a una reserva
 * POST /api/v1/reservations/:id/charges
 */
async function addManualCharge(req, res) {
  try {
    const { id } = req.params;
    const { chargeType, description, amount, quantity, roomId } = req.body;
    const userId = req.user.id;

    // Validaciones de entrada
    if (!chargeType) {
      return res.status(400).json({
        message: 'El tipo de cargo es requerido',
      });
    }

    if (!amount) {
      return res.status(400).json({
        message: 'El monto es requerido',
      });
    }

    const charge = await chargesService.addManualCharge(parseInt(id), {
      chargeType,
      description,
      amount: parseFloat(amount),
      quantity: quantity ? parseInt(quantity) : 1,
      roomId: roomId ? parseInt(roomId) : null,
      chargedById: userId,
    });

    return res.status(201).json({
      message: 'Cargo manual agregado exitosamente',
      charge,
    });
  } catch (error) {

    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
      description: `Error al agregar cargo manual: ${error.message}`,
      originModule: 'charges.controller - addManualCharge',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      message: error.message || 'Error al agregar cargo manual',
    });
  }
}

/**
 * Obtener todos los cargos manuales de una reserva
 * GET /api/v1/reservations/:id/charges
 */
async function getManualCharges(req, res) {
  try {
    const { id } = req.params;

    const charges = await chargesService.getManualCharges(parseInt(id));

    return res.status(200).json(charges);
  } catch (error) {

    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
      description: `Error al obtener cargos manuales: ${error.message}`,
      originModule: 'charges.controller - getManualCharges',
      severity: 'low',
      errorObject: error,
    });

    return res.status(500).json({
      message: error.message || 'Error al obtener cargos manuales',
    });
  }
}

/**
 * Eliminar un cargo manual
 * DELETE /api/v1/reservations/:id/charges/:chargeId
 */
async function removeManualCharge(req, res) {
  try {
    const { chargeId } = req.params;
    const userId = req.user.id;

    if (!chargeId) {
      return res.status(400).json({
        message: 'El ID del cargo es requerido',
      });
    }

    const charge = await chargesService.removeManualCharge(
      parseInt(chargeId),
      userId
    );

    return res.status(200).json({
      message: 'Cargo manual eliminado exitosamente',
      charge,
    });
  } catch (error) {

    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
      description: `Error al eliminar cargo manual: ${error.message}`,
      originModule: 'charges.controller - removeManualCharge',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      message: error.message || 'Error al eliminar cargo manual',
    });
  }
}

export default {
  addManualCharge,
  getManualCharges,
  removeManualCharge,
};
