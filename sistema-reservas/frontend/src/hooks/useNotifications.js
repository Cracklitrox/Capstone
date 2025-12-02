import { useState, useEffect, useCallback } from 'react';
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
 * Hook personalizado para manejar notificaciones en tiempo real
 * @param {string} token - JWT token del usuario autenticado
 * @returns {Object} Estado y funciones para manejar notificaciones
 */
export function useNotifications(token) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);

  // Cargar notificaciones iniciales
  const loadNotifications = useCallback(
    async (filters = {}) => {
      if (!token) return;

      try {
        setLoading(true);
        setError(null);
        const response = await getUserNotifications(filters);
        setNotifications(response.data || []);
      } catch (err) {
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
      const response = await getUnreadCount();
      setUnreadCount(response.count || 0);
    } catch (err) {
    }
  }, [token]);

  // Conectar Socket.io
  useEffect(() => {
    if (!token) return;

    // Conectar socket
    socketService.connect(token);
    setConnected(socketService.isConnected());

    // Cargar datos iniciales
    loadNotifications({ archived: false });
    loadUnreadCount();

    // Listener para nuevas notificaciones
    socketService.onNewNotification((notification) => {

      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Mostrar notificación del navegador si está permitido
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/logo.svg',
        });
      }
    });

    // Listener para actualizaciones de notificaciones
    socketService.onNotificationUpdated((data) => {

      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === data.notificationId
            ? { ...notif, status: data.status }
            : notif
        )
      );

      if (data.status === 'read') {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    });

    // Cleanup al desmontar
    return () => {
      socketService.removeAllListeners();
    };
  }, [token, loadNotifications, loadUnreadCount]);

  // Crear nueva notificación
  const sendNotification = useCallback(
    async (notificationData) => {
      if (!token) return;

      try {
        const response = await createNotification(notificationData);
        return response;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [token]
  );

  // Marcar como leída
  const markAsRead = useCallback(
    async (notificationId) => {
      if (!token) return;

      try {
        await markNotificationAsRead(notificationId);

        // Emitir por socket para sincronizar otras tabs
        socketService.markAsRead(notificationId);

        // Actualizar estado local
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId ? { ...notif, status: 'read' } : notif
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        setError(err.message);
      }
    },
    [token]
  );

  // Marcar como archivada
  const markAsArchived = useCallback(
    async (notificationId) => {
      if (!token) return;

      try {
        await markNotificationAsArchived(notificationId);

        // Emitir por socket
        socketService.markAsArchived(notificationId);

        // Remover de la lista local
        setNotifications((prev) =>
          prev.filter((notif) => notif.id !== notificationId)
        );

        // Reducir contador si no estaba leída
        const notification = notifications.find((n) => n.id === notificationId);
        if (notification?.status === 'unread') {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (err) {
        setError(err.message);
      }
    },
    [token, notifications]
  );

  // Desarchivar notificación
  const unarchive = useCallback(
    async (notificationId) => {
      if (!token) return;

      try {
        await unarchiveNotification(notificationId);

        // Recargar notificaciones
        await loadNotifications({ archived: false });
      } catch (err) {
        setError(err.message);
      }
    },
    [token, loadNotifications]
  );

  // Marcar todas como leídas
  const markAllRead = useCallback(async () => {
    if (!token) return;

    try {
      await markAllAsRead();

      // Actualizar estado local
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, status: 'read' }))
      );
      setUnreadCount(0);
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  // Solicitar permisos de notificaciones del navegador
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    connected,
    sendNotification,
    markAsRead,
    markAsArchived,
    unarchive,
    markAllRead,
    loadNotifications,
    loadUnreadCount,
    requestNotificationPermission,
  };
}
