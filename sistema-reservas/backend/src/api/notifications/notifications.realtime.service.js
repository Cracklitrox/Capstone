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
 * Obtiene todas las notificaciones del usuario (recibidas Y enviadas)
 */
async function getUserNotifications(userId, filters = {}) {
  const { status, archived, limit = 50, offset = 0 } = filters;

  // 1. Obtener notificaciones RECIBIDAS
  const whereReceived = {
    user_id: userId,
  };

  // Filtrar por estado (read/unread)
  if (status) {
    whereReceived.status = status;
  }

  // Filtrar por archivado
  if (archived !== undefined) {
    if (archived === true) {
      whereReceived.archived_at = { not: null };
    } else {
      whereReceived.archived_at = null;
    }
  }

  const receivedNotifications = await prisma.notification_read_status.findMany({
    where: whereReceived,
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
  });

  // 2. Obtener notificaciones ENVIADAS
  const sentNotifications = await prisma.notifications.findMany({
    where: {
      sender_id: userId,
    },
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
  });

  // Formatear notificaciones recibidas
  const formattedReceived = receivedNotifications.map((readStatus) => ({
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
    // Incluir objeto read_status para compatibilidad con el frontend
    read_status: {
      status: readStatus.status,
      read_at: readStatus.status === 'read' ? readStatus.updated_at : null,
      updated_at: readStatus.updated_at,
    },
  }));

  // Formatear notificaciones enviadas
  const formattedSent = sentNotifications.map((notification) => ({
    id: notification.id,
    title: notification.title,
    message: notification.message,
    category: notification.category || 'general',
    sender: {
      id: notification.users.id,
      name: `${notification.users.first_name} ${notification.users.paternal_last_name}${
        notification.users.maternal_last_name
          ? ' ' + notification.users.maternal_last_name
          : ''
      }`,
    },
    targetRole: notification.roles?.name || null,
    sentAt: notification.sent_at,
    status: 'sent', // Estado especial para notificaciones enviadas
    readAt: null,
    archivedAt: null,
    isArchived: false,
    // No incluir read_status para notificaciones enviadas
    read_status: null,
  }));

  // Combinar ambas listas y ordenar por fecha
  const allNotifications = [...formattedReceived, ...formattedSent]
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))
    .slice(offset, offset + limit);

  return allNotifications;
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
  // Primero verificar si la notificación fue enviada por este usuario
  const sentNotification = await prisma.notifications.findFirst({
    where: {
      id: notificationId,
      sender_id: userId,
    },
  });

  // Si el usuario es el emisor, eliminar la notificación completa
  if (sentNotification) {
    await prisma.notifications.delete({
      where: {
        id: notificationId,
      },
    });
    return { success: true, message: 'Notificación eliminada' };
  }

  // Si no es el emisor, eliminar solo el registro de lectura (receptor)
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

/**
 * Obtiene estadísticas de lectura de una notificación
 * Devuelve quién ha leído y quién no ha leído el mensaje
 */
async function getNotificationReadStats(notificationId, userId) {
  // Verificar que la notificación existe y fue enviada por el usuario
  const notification = await prisma.notifications.findFirst({
    where: {
      id: notificationId,
      sender_id: userId,
    },
    include: {
      roles: true,
    },
  });

  if (!notification) {
    throw new Error('Notificación no encontrada o no tienes permiso para ver sus estadísticas');
  }

  // Obtener todos los estados de lectura de esta notificación
  const readStatuses = await prisma.notification_read_status.findMany({
    where: {
      notification_id: notificationId,
    },
    include: {
      users: {
        select: {
          id: true,
          first_name: true,
          paternal_last_name: true,
          maternal_last_name: true,
          email: true,
        },
      },
    },
    orderBy: [
      {
        status: 'asc', // 'read' primero, luego 'unread'
      },
      {
        updated_at: 'desc',
      },
    ],
  });

  // Separar en leídos y no leídos
  const readBy = [];
  const unreadBy = [];

  readStatuses.forEach((status) => {
    const userData = {
      id: status.users.id,
      name: `${status.users.first_name} ${status.users.paternal_last_name}`,
      fullName: `${status.users.first_name} ${status.users.paternal_last_name} ${status.users.maternal_last_name || ''}`.trim(),
      email: status.users.email,
      readAt: status.status === 'read' ? status.updated_at : null,
    };

    if (status.status === 'read') {
      readBy.push(userData);
    } else {
      unreadBy.push(userData);
    }
  });

  return {
    notificationId: notification.id,
    title: notification.title,
    targetRole: notification.roles?.name || null,
    totalRecipients: readStatuses.length,
    readCount: readBy.length,
    unreadCount: unreadBy.length,
    readBy,
    unreadBy,
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
  getNotificationReadStats,
};
