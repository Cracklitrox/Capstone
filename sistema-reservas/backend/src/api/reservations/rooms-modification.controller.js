import roomsModificationService from './rooms-modification.service.js';
import { logError } from '../../utils/errorLogger.js';

/**
 * Obtener habitaciones disponibles para upgrade
 * GET /api/v1/rooms/available-upgrades?reservationId=X
 */
async function getAvailableUpgrades(req, res) {
  try {
    const { reservationId } = req.query;

    if (!reservationId) {
      return res.status(400).json({
        message: 'El ID de la reserva es requerido',
      });
    }

    const upgrades = await roomsModificationService.getAvailableUpgrades(
      parseInt(reservationId)
    );

    return res.status(200).json({ upgrades });
  } catch (error) {

    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
      description: `Error al obtener habitaciones para upgrade: ${error.message}`,
      originModule: 'rooms-modification.controller - getAvailableUpgrades',
      severity: 'low',
      errorObject: error,
    });

    return res.status(500).json({
      message: error.message || 'Error al obtener habitaciones para upgrade',
    });
  }
}

/**
 * Realizar upgrade de habitación
 * POST /api/v1/reservations/:id/upgrade-room
 */
async function upgradeRoom(req, res) {
  try {
    const { id } = req.params;
    const { oldRoomId, newRoomId, reason } = req.body;
    const userId = req.user.id;

    if (!newRoomId) {
      return res.status(400).json({
        message: 'El ID de la nueva habitación es requerido',
      });
    }

    const reservation = await roomsModificationService.upgradeRoom(parseInt(id), {
      oldRoomId: oldRoomId ? parseInt(oldRoomId) : null,
      newRoomId: parseInt(newRoomId),
      reason: reason || 'Solicitud del huésped',
      userId,
    });

    return res.status(200).json({
      message: 'Upgrade de habitación realizado exitosamente',
      reservation,
    });
  } catch (error) {

    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
      description: `Error al realizar upgrade de habitación: ${error.message}`,
      originModule: 'rooms-modification.controller - upgradeRoom',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      message: error.message || 'Error al realizar upgrade de habitación',
    });
  }
}

/**
 * Cambiar habitación
 * POST /api/v1/reservations/:id/change-room
 */
async function changeRoom(req, res) {
  try {
    const { id } = req.params;
    const { oldRoomId, newRoomId, reason } = req.body;
    const userId = req.user.id;

    if (!oldRoomId || !newRoomId) {
      return res.status(400).json({
        message: 'Los IDs de ambas habitaciones son requeridos',
      });
    }

    if (!reason) {
      return res.status(400).json({
        message: 'La razón del cambio es requerida',
      });
    }

    const reservation = await roomsModificationService.changeRoom(parseInt(id), {
      oldRoomId: parseInt(oldRoomId),
      newRoomId: parseInt(newRoomId),
      reason,
      userId,
    });

    return res.status(200).json({
      message: 'Cambio de habitación realizado exitosamente',
      reservation,
    });
  } catch (error) {

    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
      description: `Error al cambiar habitación: ${error.message}`,
      originModule: 'rooms-modification.controller - changeRoom',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      message: error.message || 'Error al cambiar habitación',
    });
  }
}

export default {
  getAvailableUpgrades,
  upgradeRoom,
  changeRoom,
};
