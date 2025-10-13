import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket?.connected) {
      console.log('Socket ya está conectado');
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket conectado:', this.socket.id);
      this.socket.emit('user:connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket desconectado:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión:', error.message);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconectado después de', attemptNumber, 'intentos');
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
      console.log('🔌 Socket desconectado manualmente');
    }
  }

  // Eventos de notificaciones
  onNewNotification(callback) {
    if (!this.socket) return;
    
    // Agregar log para verificar que el evento se está registrando
    console.log('🔔 Registrando listener para notification:new');
    
    this.socket.on('notification:new', (data) => {
      console.log('📨 Evento notification:new recibido en socketService:', data);
      callback(data);
    });
    this.listeners.set('notification:new', callback);
  }

  onNotificationUpdated(callback) {
    if (!this.socket) return;
    
    this.socket.on('notification:updated', callback);
    this.listeners.set('notification:updated', callback);
  }

  onUserStatus(callback) {
    if (!this.socket) return;
    
    this.socket.on('user:status', callback);
    this.listeners.set('user:status', callback);
  }

  // Escuchar cambios en el estado de conexión
  onConnect(callback) {
    if (!this.socket) return;
    
    this.socket.on('connect', callback);
    this.listeners.set('socket:connect', callback);
  }

  onDisconnect(callback) {
    if (!this.socket) return;
    
    this.socket.on('disconnect', callback);
    this.listeners.set('socket:disconnect', callback);
  }

  // Emitir eventos
  sendNotification(data) {
    if (!this.socket) {
      console.error('Socket no conectado');
      return;
    }
    
    this.socket.emit('notification:send', data);
  }

  markAsRead(notificationId) {
    if (!this.socket) return;
    
    this.socket.emit('notification:markAsRead', { notificationId });
  }

  markAsArchived(notificationId) {
    if (!this.socket) return;
    
    this.socket.emit('notification:markAsArchived', { notificationId });
  }

  requestUnreadCount() {
    if (!this.socket) return;
    
    this.socket.emit('notification:requestUnread');
  }

  // Remover listeners
  removeListener(eventName) {
    if (this.socket && this.listeners.has(eventName)) {
      const callback = this.listeners.get(eventName);
      this.socket.off(eventName, callback);
      this.listeners.delete(eventName);
    }
  }

  removeAllListeners() {
    if (this.socket) {
      this.listeners.forEach((callback, eventName) => {
        this.socket.off(eventName, callback);
      });
      this.listeners.clear();
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

// Singleton instance
const socketService = new SocketService();

export default socketService;
