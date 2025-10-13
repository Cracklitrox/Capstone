const notificationService = require('./notifications.realtime.service');

/**
 * Controlador para crear una nueva notificación
 * @route POST /api/v1/notifications
 */
async function createNotification(req, res, next) {
  try {
    const { targetRoleId, targetUserId, targetUserIds, title, message, notificationType, category } = req.body;
    const senderId = req.user.id; // Cambiado de req.user.userId a req.user.id

    console.log('📤 Recibiendo petición para crear notificación:', req.body);

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
    console.error('Error al crear notificación:', error);
    next(error);
  }
}

/**
 * Controlador para obtener todas las notificaciones del usuario autenticado
 * @route GET /api/v1/notifications
 */
async function getUserNotifications(req, res, next) {
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
    console.error('Error al obtener notificaciones:', error);
    next(error);
  }
}

/**
 * Controlador para marcar una notificación como leída
 * @route PUT /api/v1/notifications/:id/read
 */
async function markAsRead(req, res, next) {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user.id;

    const result = await notificationService.markAsRead(notificationId, userId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Error al marcar como leída:', error);
    next(error);
  }
}

/**
 * Controlador para marcar una notificación como archivada
 * @route PUT /api/v1/notifications/:id/archive
 */
async function markAsArchived(req, res, next) {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user.id;

    const result = await notificationService.markAsArchived(notificationId, userId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Error al archivar notificación:', error);
    next(error);
  }
}

/**
 * Controlador para desarchivar una notificación
 * @route PUT /api/v1/notifications/:id/unarchive
 */
async function unarchiveNotification(req, res, next) {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user.id;

    const result = await notificationService.unarchiveNotification(notificationId, userId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Error al desarchivar notificación:', error);
    next(error);
  }
}

/**
 * Controlador para eliminar una notificación
 * @route DELETE /api/v1/notifications/:id
 */
async function deleteNotification(req, res, next) {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user.id;

    const result = await notificationService.deleteNotification(notificationId, userId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    next(error);
  }
}

/**
 * Controlador para obtener el conteo de notificaciones no leídas
 * @route GET /api/v1/notifications/unread-count
 */
async function getUnreadCount(req, res, next) {
  try {
    const userId = req.user.id;
    const count = await notificationService.getUnreadCount(userId);

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error('Error al obtener conteo de no leídas:', error);
    next(error);
  }
}

/**
 * Controlador para marcar todas las notificaciones como leídas
 * @route PUT /api/v1/notifications/mark-all-read
 */
async function markAllAsRead(req, res, next) {
  try {
    const userId = req.user.id;
    const result = await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Error al marcar todas como leídas:', error);
    next(error);
  }
}

/**
 * Controlador para obtener usuarios por rol
 * @route GET /api/v1/notifications/users-by-role/:roleId
 */
async function getUsersByRole(req, res, next) {
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
    console.error('Error al obtener usuarios por rol:', error);
    next(error);
  }
}

/**
 * Controlador para obtener estadísticas de lectura de una notificación
 * @route GET /api/v1/notifications/:id/read-stats
 */
async function getNotificationReadStats(req, res, next) {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user.id;

    const stats = await notificationService.getNotificationReadStats(notificationId, userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de lectura:', error);
    if (error.message.includes('no encontrada') || error.message.includes('no tienes permiso')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
}

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAsArchived,
  unarchiveNotification,
  deleteNotification,
  getUnreadCount,
  markAllAsRead,
  getUsersByRole,
  getNotificationReadStats,
};
