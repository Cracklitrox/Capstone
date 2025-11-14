const { PrismaClient } = require("@prisma/client");
const { emitNotification, emitCheckoutAlerts } = require("../../config/socket");

const prisma = new PrismaClient();

/**
 * Crea una notificación y la envía en tiempo real
 */
async function createNotification(data) {
  const {
    senderId,
    targetRoleId,
    targetUserId,
    targetUserIds,
    title,
    message,
    notificationType,
    category,
  } = data;

  // Validar que al menos haya un targetRoleId
  if (!targetRoleId) {
    throw new Error("targetRoleId es requerido");
  }

  // Preparar los datos de la notificación
  const notificationData = {
    title,
    message: message || null,
    category: category || "general", // Categoría por defecto
    users: {
      connect: { id: senderId },
    },
    roles: {
      connect: { id: targetRoleId },
    },
  };

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

  console.log("🎯 Notificación creada con target_role_id:", targetRoleId);

  // Determinar qué usuarios deben recibir la notificación
  let targetUsers = [];

  // Si se especificaron usuarios específicos (targetUserId o targetUserIds)
  if (targetUserId || (targetUserIds && targetUserIds.length > 0)) {
    // Usar la lista de IDs especificada
    const userIds =
      targetUserIds && targetUserIds.length > 0
        ? targetUserIds
        : [targetUserId];

    console.log("👤 Enviando a usuarios específicos:", userIds);

    // Obtener información de los usuarios
    targetUsers = await prisma.users.findMany({
      where: {
        id: { in: userIds },
        status: "active",
      },
      select: {
        id: true,
        first_name: true,
        email: true,
      },
    });
  } else {
    // Enviar a TODOS los usuarios del rol
    console.log("👥 Enviando a todos los usuarios del rol:", targetRoleId);

    targetUsers = await prisma.users.findMany({
      where: {
        status: "active",
        user_roles: {
          some: {
            role_id: targetRoleId,
          },
        },
        // Excluir al remitente
        NOT: {
          id: senderId,
        },
      },
      select: {
        id: true,
        first_name: true,
        email: true,
      },
    });
  }

  console.log(
    "✅ Usuarios destinatarios:",
    targetUsers.map((u) => ({ id: u.id, name: u.first_name }))
  );

  // Crear estados de lectura para cada usuario destinatario
  const readStatusPromises = targetUsers.map((user) =>
    prisma.notification_read_status.create({
      data: {
        notification_id: notification.id,
        user_id: user.id,
        status: "unread",
      },
    })
  );

  await Promise.all(readStatusPromises);

  // Emitir por Socket.io a cada usuario específico
  const notificationPayload = {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    category: notification.category || "general",
    sender: {
      id: notification.users.id,
      name: `${notification.users.first_name} ${notification.users.paternal_last_name}`,
    },
    sentAt: notification.sent_at,
    status: "unread",
    type: notificationType || "general",
  };

  // Emitir a cada usuario específico
  targetUsers.forEach((user) => {
    emitNotification(user.id, null, notificationPayload);
  });

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
    deleted_at: null, // ✅ NO mostrar notificaciones eliminadas
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
      notification_read_status: {
        select: {
          deleted_at: true,
        },
      },
    },
  });

  // ✅ Filtrar notificaciones enviadas que han sido eliminadas
  // Una notificación enviada se considera eliminada si TODOS sus notification_read_status tienen deleted_at
  const activeSentNotifications = sentNotifications.filter((notification) => {
    // Si no tiene ningún read_status, mostrarla (caso edge)
    if (!notification.notification_read_status || notification.notification_read_status.length === 0) {
      return true;
    }

    // Verificar si al menos un receptor NO tiene la notificación eliminada
    const hasActiveRecipient = notification.notification_read_status.some(
      (status) => status.deleted_at === null
    );

    return hasActiveRecipient;
  });

  // Formatear notificaciones recibidas
  const formattedReceived = receivedNotifications.map((readStatus) => ({
    id: readStatus.notifications.id,
    title: readStatus.notifications.title,
    message: readStatus.notifications.message,
    category: readStatus.notifications.category || "general",
    sender: {
      id: readStatus.notifications.users.id,
      name: `${readStatus.notifications.users.first_name} ${
        readStatus.notifications.users.paternal_last_name
      }${
        readStatus.notifications.users.maternal_last_name
          ? " " + readStatus.notifications.users.maternal_last_name
          : ""
      }`,
    },
    targetRole: readStatus.notifications.roles?.name || null,
    sentAt: readStatus.notifications.sent_at,
    status: readStatus.status,
    readAt: readStatus.status === "read" ? readStatus.updated_at : null,
    archivedAt: readStatus.archived_at,
    isArchived: !!readStatus.archived_at,
    // Incluir objeto read_status para compatibilidad con el frontend
    read_status: {
      status: readStatus.status,
      read_at: readStatus.status === "read" ? readStatus.updated_at : null,
      updated_at: readStatus.updated_at,
    },
  }));

  // Formatear notificaciones enviadas (usando activeSentNotifications filtradas)
  const formattedSent = activeSentNotifications.map((notification) => ({
    id: notification.id,
    title: notification.title,
    message: notification.message,
    category: notification.category || "general",
    sender: {
      id: notification.users.id,
      name: `${notification.users.first_name} ${
        notification.users.paternal_last_name
      }${
        notification.users.maternal_last_name
          ? " " + notification.users.maternal_last_name
          : ""
      }`,
    },
    targetRole: notification.roles?.name || null,
    sentAt: notification.sent_at,
    status: "sent", // Estado especial para notificaciones enviadas
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
      status: "read",
      updated_at: new Date(),
    },
  });

  if (readStatus.count === 0) {
    throw new Error("Notificación no encontrada para este usuario");
  }

  return { success: true, message: "Notificación marcada como leída" };
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
    throw new Error("Notificación no encontrada para este usuario");
  }

  return { success: true, message: "Notificación archivada" };
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
    throw new Error("Notificación no encontrada para este usuario");
  }

  return { success: true, message: "Notificación restaurada" };
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

  // Si el usuario es el emisor, marcar como eliminado para TODOS los receptores
  if (sentNotification) {
    await prisma.notification_read_status.updateMany({
      where: {
        notification_id: notificationId,
      },
      data: {
        deleted_at: new Date(),
      },
    });

    console.log(
      `🗑️ Emisor ${userId} marcó notificación ${notificationId} como eliminada para todos`
    );
    return {
      success: true,
      message: "Notificación marcada como eliminada para todos los receptores",
    };
  }

  // Si no es el emisor, marcar como eliminado solo para este receptor
  const readStatus = await prisma.notification_read_status.updateMany({
    where: {
      notification_id: notificationId,
      user_id: userId,
    },
    data: {
      deleted_at: new Date(),
    },
  });

  if (readStatus.count === 0) {
    throw new Error("Notificación no encontrada para este usuario");
  }

  console.log(
    `🗑️ Receptor ${userId} marcó notificación ${notificationId} como eliminada`
  );
  return { success: true, message: "Notificación marcada como eliminada" };
}

/**
 * Obtiene el conteo de notificaciones no leídas de un usuario
 */
async function getUnreadCount(userId) {
  const count = await prisma.notification_read_status.count({
    where: {
      user_id: userId,
      status: "unread",
      archived_at: null,
      deleted_at: null, // ✅ NO contar notificaciones eliminadas
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
      status: "unread",
      archived_at: null,
    },
    data: {
      status: "read",
      updated_at: new Date(),
    },
  });

  return {
    success: true,
    message: `${result.count} notificaciones marcadas como leídas`,
  };
}

/**
 * Obtiene usuarios por rol (excluyendo al usuario actual)
 */
async function getUsersByRole(roleId, currentUserId) {
  const users = await prisma.users.findMany({
    where: {
      status: "active",
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
      first_name: "asc",
    },
  });

  return users.map((user) => ({
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
    message: `${result.count} notificaciones antiguas eliminadas`,
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
    throw new Error(
      "Notificación no encontrada o no tienes permiso para ver sus estadísticas"
    );
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
        status: "asc", // 'read' primero, luego 'unread'
      },
      {
        updated_at: "desc",
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
      fullName: `${status.users.first_name} ${
        status.users.paternal_last_name
      } ${status.users.maternal_last_name || ""}`.trim(),
      email: status.users.email,
      readAt: status.status === "read" ? status.updated_at : null,
    };

    if (status.status === "read") {
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

// ⭐ NUEVA FUNCIÓN: Emitir notificaciones de checkout
/**
 * Emite notificaciones de checkout a todos los recepcionistas y administradores conectados
 * @param {number} count - Número de checkouts pendientes
 * @param {Array} data - Array con los datos de los checkouts
 */
async function emitCheckoutNotifications(count, data) {
  try {
    emitCheckoutAlerts(count, data);
    console.log(
      `📬 Notificación de ${count} checkout(s) emitida a recepcionistas`
    );
  } catch (error) {
    console.error("❌ Error al emitir notificaciones de checkout:", error);
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
  deleteOldNotifications,
  getNotificationReadStats,
  emitCheckoutNotifications,
};