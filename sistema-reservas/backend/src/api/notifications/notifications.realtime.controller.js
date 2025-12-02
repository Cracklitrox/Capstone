import * as notificationService from './notifications.realtime.service.js';

/**
 * Controlador para crear una nueva notificación
 * @route POST /api/v1/notifications
 */
export async function createNotification(req, res, next) {
  try {
    const { targetRoleId, targetUserId, targetUserIds, title, message, notificationType, category } = req.body;
    const senderId = req.user.id; // Cambiado de req.user.userId a req.user.id


    // Validaciones
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'El título es requerido',
      });
    }

    if (!targetRoleId) {
      return res.status(400).json({
        success: false,
        message: 'targetRoleId es requerido',
      });
    }

    const notification = await notificationService.createNotification({
      senderId,
      targetRoleId,
      targetUserId,
      targetUserIds,
      title,
      message,
      notificationType,
      category,
    });

    res.status(201).json({
      success: true,
      message: 'Notificación creada y enviada correctamente',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controlador para obtener todas las notificaciones del usuario autenticado
 * @route GET /api/v1/notifications
 */
export async function getUserNotifications(req, res, next) {
  try {
    const userId = req.user.id;
    const { status, archived, limit, offset } = req.query;

    const filters = {
      status,
      archived: archived === 'true' ? true : archived === 'false' ? false : undefined,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    };

    const notifications = await notificationService.getUserNotifications(userId, filters);

    res.json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controlador para marcar una notificación como leída
 * @route PUT /api/v1/notifications/:id/read
 */
export async function markAsRead(req, res, next) {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user.id;

    const result = await notificationService.markAsRead(notificationId, userId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controlador para marcar una notificación como archivada
 * @route PUT /api/v1/notifications/:id/archive
 */
export async function markAsArchived(req, res, next) {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user.id;

    const result = await notificationService.markAsArchived(notificationId, userId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controlador para desarchivar una notificación
 * @route PUT /api/v1/notifications/:id/unarchive
 */
export async function unarchiveNotification(req, res, next) {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user.id;

    const result = await notificationService.unarchiveNotification(notificationId, userId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controlador para eliminar una notificación
 * @route DELETE /api/v1/notifications/:id
 */
export async function deleteNotification(req, res, next) {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user.id;

    const result = await notificationService.deleteNotification(notificationId, userId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controlador para obtener el conteo de notificaciones no leídas
 * @route GET /api/v1/notifications/unread-count
 */
export async function getUnreadCount(req, res, next) {
  try {
    const userId = req.user.id;
    const count = await notificationService.getUnreadCount(userId);

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controlador para marcar todas las notificaciones como leídas
 * @route PUT /api/v1/notifications/mark-all-read
 */
export async function markAllAsRead(req, res, next) {
  try {
    const userId = req.user.id;
    const result = await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controlador para obtener usuarios por rol
 * @route GET /api/v1/notifications/users-by-role/:roleId
 */
export async function getUsersByRole(req, res, next) {
  try {
    const roleId = parseInt(req.params.roleId);
    const currentUserId = req.user.id;

    const users = await notificationService.getUsersByRole(roleId, currentUserId);

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controlador para obtener estadísticas de lectura de una notificación
 * @route GET /api/v1/notifications/:id/read-stats
 */
export async function getNotificationReadStats(req, res, next) {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user.id;

    const stats = await notificationService.getNotificationReadStats(notificationId, userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    if (error.message.includes('no encontrada') || error.message.includes('no tienes permiso')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}
