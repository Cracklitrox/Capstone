import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
    // Configuración de transporte
    transports: ["websocket", "polling"],
    // Configuración de ping/pong
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Middleware de autenticación para sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // El token usa 'id' no 'userId'
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {

    // Unir al usuario a su sala personal y sala de rol
    socket.join(`user:${socket.userId}`);
    socket.join(`role:${socket.userRole}`);
    socket.on('checkout:requestUpdate', async () => {
      try {
        const notificationsService = await import('../api/notifications/notifications.service.js');
        const alerts = await notificationsService.getCheckoutAlertsForToday();

        socket.emit('checkout:update', {
          count: alerts.length,
          data: alerts,
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        socket.emit('checkout:error', { message: 'Error al obtener checkouts' });
      }
    });

    // ⭐ NUEVO: Unir a recepcionistas y admins a sala de checkout alerts
    if (
      socket.userRole === "receptionist" ||
      socket.userRole === "administrator"
    ) {
      socket.join("checkout_alerts");
    }



    // Evento: Usuario se conecta
    socket.on("user:connected", () => {
      socket.broadcast.emit("user:status", {
        userId: socket.userId,
        status: "online",
      });
    });

    // ⭐ NUEVO: Solicitar actualización inmediata de checkout alerts
    socket.on("checkout:requestUpdate", async () => {
      try {
        const notificationsService = await import("../api/notifications/notifications.service.js");
        const alerts = await notificationsService.getCheckoutAlertsForToday();

        socket.emit("checkout:update", {
          count: alerts.length,
          data: alerts,
          timestamp: new Date().toISOString(),
        });


      } catch (error) {
        socket.emit("checkout:error", {
          message: "Error al obtener alertas de checkout",
        });
      }
    });

    // ⭐ NUEVO: Solicitar conteo de solicitudes WhatsApp pendientes
    socket.on("whatsapp:requestUpdate", async () => {
      try {
        const { default: prisma } = await import("../db/prisma.client.js");
        const pendingCount = await prisma.alerts.count({
          where: {
            type: "booking_request",
            status: "pending",
            last_viewed_at: null, // Solo contar las no vistas
          },
        });

        socket.emit("whatsapp:update", {
          count: pendingCount,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        socket.emit("whatsapp:error", {
          message: "Error al obtener solicitudes de WhatsApp",
        });
      }
    });

    // Evento: Enviar notificación
    socket.on("notification:send", async (data) => {
      try {

        // Emitir a usuarios específicos o roles
        if (data.targetUserId) {
          io.to(`user:${data.targetUserId}`).emit("notification:new", data);
        } else if (data.targetRole) {
          io.to(`role:${data.targetRole}`).emit("notification:new", data);
        }
      } catch (error) {
        socket.emit("notification:error", {
          message: "Error al enviar notificación",
        });
      }
    });

    // Evento: Marcar como leída
    socket.on("notification:markAsRead", (data) => {

      // Emitir actualización a todos los clientes del usuario (múltiples tabs)
      io.to(`user:${socket.userId}`).emit("notification:updated", {
        notificationId: data.notificationId,
        status: "read",
      });
    });

    // Evento: Marcar como archivada
    socket.on("notification:markAsArchived", (data) => {

      // Emitir actualización a todos los clientes del usuario
      io.to(`user:${socket.userId}`).emit("notification:updated", {
        notificationId: data.notificationId,
        status: "archived",
      });
    });

    // Evento: Solicitar notificaciones no leídas
    socket.on("notification:requestUnread", () => {
      socket.emit("notification:requestUnreadCount");
    });

    // Evento: Desconexión
    socket.on("disconnect", (reason) => {

      socket.broadcast.emit("user:status", {
        userId: socket.userId,
        status: "offline",
      });
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io no ha sido inicializado");
  }
  return io;
};

// Función auxiliar para emitir notificaciones desde cualquier parte del backend
const emitNotification = (targetUserId, targetRole, notification) => {
  const socketIO = getIO();


  if (targetUserId) {
    socketIO.to(`user:${targetUserId}`).emit("notification:new", notification);
  } else if (targetRole) {
    socketIO.to(`role:${targetRole}`).emit("notification:new", notification);
  }
};

// ==================== CHECKOUT ALERTS WEBSOCKET ====================

/**
 * Emite notificaciones de checkout a todos los recepcionistas y administradores conectados
 * @param {number} count - Número de checkouts pendientes
 * @param {Array} data - Array con los datos de los checkouts
 */
function emitCheckoutAlerts(count, data) {
  const socketIO = getIO();

  const payload = {
    count,
    data,
    timestamp: new Date().toISOString(),
  };

  // Emitir solo a recepcionistas
  socketIO.to('role:receptionist').emit('checkout:update', payload);
}

export {
  initializeSocket,
  getIO,
  emitNotification,
  emitCheckoutAlerts,
};