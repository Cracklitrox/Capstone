const extensionService = require('./extension.service');
const { logError } = require('../../utils/errorLogger');

/**
 * Verificar disponibilidad para extensión de estadía
 * POST /api/v1/reservations/:id/check-availability-extension
 */
async function checkExtensionAvailability(req, res) {
  try {
    const { id } = req.params;
    const { newCheckOutDate } = req.body;

    if (!newCheckOutDate) {
      return res.status(400).json({
        message: 'La nueva fecha de check-out es requerida',
      });
    }

    const result = await extensionService.checkExtensionAvailability(
      parseInt(id),
      newCheckOutDate
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error al verificar disponibilidad para extensión:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
      description: `Error al verificar disponibilidad para extensión: ${error.message}`,
      originModule: 'extension.controller - checkExtensionAvailability',
      severity: 'low',
      errorObject: error,
    });

    return res.status(500).json({
      message: error.message || 'Error al verificar disponibilidad para extensión',
    });
  }
}

/**
 * Extender estadía de una reserva
 * POST /api/v1/reservations/:id/extend
 */
async function extendStay(req, res) {
  try {
    const { id } = req.params;
    const { newCheckOutDate } = req.body;
    const userId = req.user.id;

    if (!newCheckOutDate) {
      return res.status(400).json({
        message: 'La nueva fecha de check-out es requerida',
      });
    }

    const reservation = await extensionService.extendStay(
      parseInt(id),
      newCheckOutDate,
      userId
    );

    return res.status(200).json({
      message: 'Estadía extendida exitosamente',
      reservation,
    });
  } catch (error) {
    console.error('Error al extender estadía:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
      description: `Error al extender estadía: ${error.message}`,
      originModule: 'extension.controller - extendStay',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      message: error.message || 'Error al extender estadía',
    });
  }
}

module.exports = {
  checkExtensionAvailability,
  extendStay,
};
