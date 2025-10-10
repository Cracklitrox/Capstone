const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Middleware de autenticación para sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ Usuario conectado: ${socket.userId} - Role: ${socket.userRole}`);

    // Unir al usuario a su sala personal y sala de rol
    socket.join(`user:${socket.userId}`);
    socket.join(`role:${socket.userRole}`);

    // Evento: Usuario se conecta
    socket.on('user:connected', () => {
      console.log(`Usuario ${socket.userId} está en línea`);
      socket.broadcast.emit('user:status', { 
        userId: socket.userId, 
        status: 'online' 
      });
    });

    // Evento: Enviar notificación
    socket.on('notification:send', async (data) => {
      try {
        console.log('📤 Enviando notificación:', data);
        
        // Emitir a usuarios específicos o roles
        if (data.targetUserId) {
          io.to(`user:${data.targetUserId}`).emit('notification:new', data);
        } else if (data.targetRole) {
          io.to(`role:${data.targetRole}`).emit('notification:new', data);
        }
      } catch (error) {
        console.error('Error al enviar notificación:', error);
        socket.emit('notification:error', { message: 'Error al enviar notificación' });
      }
    });

    // Evento: Marcar como leída
    socket.on('notification:markAsRead', (data) => {
      console.log(`📖 Notificación ${data.notificationId} marcada como leída por usuario ${socket.userId}`);
      // Emitir actualización a todos los clientes del usuario (múltiples tabs)
      io.to(`user:${socket.userId}`).emit('notification:updated', {
        notificationId: data.notificationId,
        status: 'read'
      });
    });

    // Evento: Marcar como archivada
    socket.on('notification:markAsArchived', (data) => {
      console.log(`📦 Notificación ${data.notificationId} archivada por usuario ${socket.userId}`);
      // Emitir actualización a todos los clientes del usuario
      io.to(`user:${socket.userId}`).emit('notification:updated', {
        notificationId: data.notificationId,
        status: 'archived'
      });
    });

    // Evento: Solicitar notificaciones no leídas
    socket.on('notification:requestUnread', () => {
      socket.emit('notification:requestUnreadCount');
    });

    // Evento: Desconexión
    socket.on('disconnect', () => {
      console.log(`❌ Usuario desconectado: ${socket.userId}`);
      socket.broadcast.emit('user:status', { 
        userId: socket.userId, 
        status: 'offline' 
      });
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io no ha sido inicializado');
  }
  return io;
};

// Función auxiliar para emitir notificaciones desde cualquier parte del backend
const emitNotification = (targetUserId, targetRole, notification) => {
  const socketIO = getIO();
  
  if (targetUserId) {
    socketIO.to(`user:${targetUserId}`).emit('notification:new', notification);
  } else if (targetRole) {
    socketIO.to(`role:${targetRole}`).emit('notification:new', notification);
  }
};

module.exports = {
  initializeSocket,
  getIO,
  emitNotification
};
