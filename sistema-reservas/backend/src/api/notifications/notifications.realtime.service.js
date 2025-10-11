const { PrismaClient } = require('@prisma/client');
const { emitNotification } = require('../../config/socket');

const prisma = new PrismaClient();

/**
 * Crea una notificación y la envía en tiempo real
 */
async function createNotification(data) {
  const { senderId, targetRoleId, targetUserId, title, message, notificationType, category } = data;

  // Preparar los datos de la notificación
  const notificationData = {
    title,
    message: message || null,
    category: category || 'general', // Categoría por defecto
    users: {
      connect: { id: senderId }
    },
  };

  // Solo agregar la relación con roles si targetRoleId existe
  if (targetRoleId) {
    notificationData.roles = {
      connect: { id: targetRoleId }
    };
  }

  // Crear la notificación en la base de datos
  const notification = await prisma.notifications.create({
    data: notificationData,
    include: {
      users: {
        select: {
          id: true,
          first_name: true,
          paternal_last_name: true,
        },
      },
      roles: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Si la notificación es para un usuario específico, crear el estado de lectura
  if (targetUserId) {
    await prisma.notification_read_status.create({
      data: {
        notification_id: notification.id,
        user_id: targetUserId,
        status: 'unread',
      },
    });

    // Emitir por Socket.io al usuario específico
    emitNotification(targetUserId, null, {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      category: notification.category || 'general',
      sender: {
        id: notification.users.id,
        name: `${notification.users.first_name} ${notification.users.paternal_last_name}`,
      },
      sentAt: notification.sent_at,
      status: 'unread',
      type: notificationType || 'general',
    });
  }

  // Si la notificación es para un rol, obtener usuarios con ese rol y crear estados
  if (targetRoleId) {
    const usersWithRole = await prisma.users.findMany({
      where: {
        status: 'active',
        user_roles: {
          some: {
            role_id: targetRoleId,
          },
        },
        // Excluir al remitente para que no se envíe notificación a sí mismo
        NOT: {
          id: senderId,
        },
      },
      select: {
        id: true,
      },
    });

    // Crear estados de lectura para cada usuario del rol
    const readStatusPromises = usersWithRole.map((user) =>
      prisma.notification_read_status.create({
        data: {
          notification_id: notification.id,
          user_id: user.id,
          status: 'unread',
        },
      })
    );

    await Promise.all(readStatusPromises);

    // Emitir por Socket.io al rol
    const roleName = notification.roles?.name;
    emitNotification(null, roleName, {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      category: notification.category || 'general',
      sender: {
        id: notification.users.id,
        name: `${notification.users.first_name} ${notification.users.paternal_last_name}`,
      },
      sentAt: notification.sent_at,
      status: 'unread',
      type: notificationType || 'general',
    });
  }

  return notification;
}

/**
 * Obtiene todas las notificaciones de un usuario con su estado de lectura
 */
async function getUserNotifications(userId, filters = {}) {
  const { status, archived, limit = 50, offset = 0 } = filters;

  const where = {
    user_id: userId,
  };

  // Filtrar por estado (read/unread)
  if (status) {
    where.status = status;
  }

  // Filtrar por archivado
  if (archived !== undefined) {
    if (archived === true) {
      where.archived_at = { not: null };
    } else {
      where.archived_at = null;
    }
  }

  const notifications = await prisma.notification_read_status.findMany({
    where,
    include: {
      notifications: {
        include: {
          users: {
            select: {
              id: true,
              first_name: true,
              paternal_last_name: true,
              maternal_last_name: true,
            },
          },
          roles: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      notifications: {
        sent_at: 'desc',
      },
    },
    take: limit,
    skip: offset,
  });

  return notifications.map((readStatus) => ({
    id: readStatus.notifications.id,
    title: readStatus.notifications.title,
    message: readStatus.notifications.message,
    category: readStatus.notifications.category || 'general',
    sender: {
      id: readStatus.notifications.users.id,
      name: `${readStatus.notifications.users.first_name} ${readStatus.notifications.users.paternal_last_name}${
        readStatus.notifications.users.maternal_last_name
          ? ' ' + readStatus.notifications.users.maternal_last_name
          : ''
      }`,
    },
    targetRole: readStatus.notifications.roles?.name || null,
    sentAt: readStatus.notifications.sent_at,
    status: readStatus.status,
    readAt: readStatus.status === 'read' ? readStatus.updated_at : null,
    archivedAt: readStatus.archived_at,
    isArchived: !!readStatus.archived_at,
  }));
}

/**
 * Marca una notificación como leída para un usuario
 */
async function markAsRead(notificationId, userId) {
  const readStatus = await prisma.notification_read_status.updateMany({
    where: {
      notification_id: notificationId,
      user_id: userId,
    },
    data: {
      status: 'read',
      updated_at: new Date(),
    },
  });

  if (readStatus.count === 0) {
    throw new Error('Notificación no encontrada para este usuario');
  }

  return { success: true, message: 'Notificación marcada como leída' };
}

/**
 * Marca una notificación como archivada para un usuario
 */
async function markAsArchived(notificationId, userId) {
  const readStatus = await prisma.notification_read_status.updateMany({
    where: {
      notification_id: notificationId,
      user_id: userId,
    },
    data: {
      archived_at: new Date(),
    },
  });

  if (readStatus.count === 0) {
    throw new Error('Notificación no encontrada para este usuario');
  }

  return { success: true, message: 'Notificación archivada' };
}

/**
 * Desmarca una notificación archivada (la restaura)
 */
async function unarchiveNotification(notificationId, userId) {
  const readStatus = await prisma.notification_read_status.updateMany({
    where: {
      notification_id: notificationId,
      user_id: userId,
    },
    data: {
      archived_at: null,
    },
  });

  if (readStatus.count === 0) {
    throw new Error('Notificación no encontrada para este usuario');
  }

  return { success: true, message: 'Notificación restaurada' };
}

/**
 * Elimina una notificación para un usuario específico
 */
async function deleteNotification(notificationId, userId) {
  const readStatus = await prisma.notification_read_status.deleteMany({
    where: {
      notification_id: notificationId,
      user_id: userId,
    },
  });

  if (readStatus.count === 0) {
    throw new Error('Notificación no encontrada para este usuario');
  }

  return { success: true, message: 'Notificación eliminada' };
}

/**
 * Obtiene el conteo de notificaciones no leídas de un usuario
 */
async function getUnreadCount(userId) {
  const count = await prisma.notification_read_status.count({
    where: {
      user_id: userId,
      status: 'unread',
      archived_at: null,
    },
  });

  return count;
}

/**
 * Marca todas las notificaciones como leídas para un usuario
 */
async function markAllAsRead(userId) {
  const result = await prisma.notification_read_status.updateMany({
    where: {
      user_id: userId,
      status: 'unread',
      archived_at: null,
    },
    data: {
      status: 'read',
      updated_at: new Date(),
    },
  });

  return { 
    success: true, 
    message: `${result.count} notificaciones marcadas como leídas` 
  };
}

/**
 * Obtiene usuarios por rol (excluyendo al usuario actual)
 */
async function getUsersByRole(roleId, currentUserId) {
  const users = await prisma.users.findMany({
    where: {
      status: 'active',
      user_roles: {
        some: {
          role_id: roleId,
        },
      },
      NOT: {
        id: currentUserId,
      },
    },
    select: {
      id: true,
      first_name: true,
      paternal_last_name: true,
      maternal_last_name: true,
      email: true,
    },
    orderBy: {
      first_name: 'asc',
    },
  });

  return users.map(user => ({
    id: user.id,
    name: `${user.first_name} ${user.paternal_last_name}`,
    fullName: `${user.first_name} ${user.paternal_last_name} ${user.maternal_last_name}`,
    email: user.email,
  }));
}

/**
 * Elimina (archiva permanentemente) notificaciones antiguas
 */
async function deleteOldNotifications(daysOld = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.notifications.deleteMany({
    where: {
      sent_at: {
        lt: cutoffDate,
      },
    },
  });

  return { 
    success: true, 
    message: `${result.count} notificaciones antiguas eliminadas` 
  };
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
  deleteOldNotifications,
};
