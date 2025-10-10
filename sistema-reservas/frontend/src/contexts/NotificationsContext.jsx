import React, { useState, useEffect, useCallback } from 'react';
import { NotificationsContext } from './NotificationsContextDefinition';
import socketService from '../services/socketService';
import {
  getUserNotifications,
  markNotificationAsRead,
  markNotificationAsArchived,
  unarchiveNotification,
  getUnreadCount,
  markAllAsRead,
  createNotification,
} from '../services/notifications';

/**
 * Provider para gestionar notificaciones en tiempo real de forma global
 */
export function NotificationsProvider({ children, token }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Cargar notificaciones iniciales
  const loadNotifications = useCallback(
    async (filters = {}) => {
      if (!token) return;

      try {
        setLoading(true);
        setError(null);
        const response = await getUserNotifications(token, filters);
        setNotifications(response.data || []);
      } catch (err) {
        console.error('Error al cargar notificaciones:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  // Cargar conteo de no leídas
  const loadUnreadCount = useCallback(async () => {
    if (!token) return;

    try {
      const response = await getUnreadCount(token);
      setUnreadCount(response.count || 0);
    } catch (err) {
      console.error('Error al cargar conteo:', err);
    }
  }, [token]);

  // Conectar Socket.io y cargar datos iniciales (solo una vez)
  useEffect(() => {
    if (!token) return;
    if (initialized) {
      console.log('⏭️ NotificationsProvider ya inicializado, saltando...');
      return;
    }

    console.log('🔌 Inicializando NotificationsProvider...');

    // Conectar socket solo si no está conectado
    if (!socketService.isConnected()) {
      socketService.connect(token);
    }
    setConnected(socketService.isConnected());

    // Cargar datos iniciales
    loadNotifications({ archived: false });
    loadUnreadCount();

    // Listener para nuevas notificaciones
    const handleNewNotification = (notification) => {
      console.log('📩 Nueva notificación recibida:', notification);
      
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      
      // Mostrar notificación del navegador si está permitido
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/logo.svg',
        });
      }
    };

    // Listener para actualizaciones de notificaciones
    const handleNotificationUpdated = (updatedNotification) => {
      console.log('🔄 Notificación actualizada:', updatedNotification);
      
      setNotifications((prev) =>
        prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
      );

      // Actualizar conteo de no leídas
      loadUnreadCount();
    };

    socketService.onNewNotification(handleNewNotification);
    socketService.onNotificationUpdated(handleNotificationUpdated);

    // Solicitar permisos de notificación del navegador
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Marcar como inicializado al final
    setInitialized(true);

    // Cleanup: NO desconectar el socket, solo remover listeners
    return () => {
      console.log('🧹 Limpiando listeners de NotificationsProvider');
      // No desconectamos el socket aquí para mantener la conexión activa
    };
  }, [token, initialized, loadNotifications, loadUnreadCount]);

  // Marcar como leída
  const markAsRead = useCallback(
    async (notificationId) => {
      if (!token) return;

      try {
        await markNotificationAsRead(token, notificationId);
        
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, read_status: { ...n.read_status, read_at: new Date().toISOString() } }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        // Emitir evento de actualización por socket
        socketService.markAsRead(notificationId);
      } catch (err) {
        console.error('Error al marcar como leída:', err);
        throw err;
      }
    },
    [token]
  );

  // Marcar como archivada
  const markAsArchived = useCallback(
    async (notificationId) => {
      if (!token) return;

      try {
        await markNotificationAsArchived(token, notificationId);
        
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        
        // Si no estaba leída, decrementar el contador
        const notification = notifications.find((n) => n.id === notificationId);
        if (notification && !notification.read_status?.read_at) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }

        // Emitir evento de actualización por socket
        socketService.markAsArchived(notificationId);
      } catch (err) {
        console.error('Error al archivar:', err);
        throw err;
      }
    },
    [token, notifications]
  );

  // Desarchivar notificación
  const unarchive = useCallback(
    async (notificationId) => {
      if (!token) return;

      try {
        await unarchiveNotification(token, notificationId);
        
        // Recargar notificaciones
        await loadNotifications({ archived: false });
        await loadUnreadCount();
      } catch (err) {
        console.error('Error al desarchivar:', err);
        throw err;
      }
    },
    [token, loadNotifications, loadUnreadCount]
  );

  // Marcar todas como leídas
  const handleMarkAllRead = useCallback(async () => {
    if (!token) return;

    try {
      await markAllAsRead(token);
      
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          read_status: { ...n.read_status, read_at: new Date().toISOString() },
        }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error al marcar todas como leídas:', err);
      throw err;
    }
  }, [token]);

  // Enviar notificación
  const sendNotification = useCallback(
    async (data) => {
      if (!token) return;

      try {
        const response = await createNotification(token, data);
        
        // Emitir por socket (el backend se encarga de broadcast)
        socketService.sendNotification(data);
        
        return response.data;
      } catch (err) {
        console.error('Error al enviar notificación:', err);
        throw err;
      }
    },
    [token]
  );

  // Recargar notificaciones (útil para refrescar manualmente)
  const refreshNotifications = useCallback(
    async (filters = { archived: false }) => {
      if (!token) return;

      try {
        setLoading(true);
        const response = await getUserNotifications(token, filters);
        setNotifications(response.data || []);
        await loadUnreadCount();
      } catch (err) {
        console.error('Error al recargar notificaciones:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [token, loadUnreadCount]
  );

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    connected,
    sendNotification,
    markAsRead,
    markAsArchived,
    unarchive,
    markAllRead: handleMarkAllRead,
    refreshNotifications,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
