import React, { useState, useEffect, useCallback } from 'react';
import { NotificationsContext } from './NotificationsContextDefinition';
import socketService from '../services/socketService';
import {
  getUserNotifications,
  markNotificationAsRead,
  markNotificationAsArchived,
  unarchiveNotification,
  deleteNotification,
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
    
    // Actualizar estado de conexión cada vez que cambie
    const updateConnectionStatus = () => {
      const isConnected = socketService.isConnected();
      console.log('🔌 Estado de conexión actualizado:', isConnected);
      setConnected(isConnected);
    };

    // Escuchar eventos de conexión/desconexión
    socketService.onConnect(() => {
      console.log('✅ Socket conectado');
      updateConnectionStatus();
    });

    socketService.onDisconnect((reason) => {
      console.log('❌ Socket desconectado:', reason);
      updateConnectionStatus();
    });

    // Establecer estado inicial
    updateConnectionStatus();

    // Cargar TODAS las notificaciones (archivadas y no archivadas)
    // El filtrado se hará en el componente NotificationPanel
    loadNotifications(); // Sin filtros para obtener todas
    loadUnreadCount();

    // Listener para nuevas notificaciones
    const handleNewNotification = (notification) => {
      console.log('📩 Nueva notificación recibida:', notification);
      
      // Verificar si la notificación ya existe para evitar duplicados
      setNotifications((prev) => {
        const exists = prev.some((n) => n.id === notification.id);
        if (exists) {
          console.log('⚠️ Notificación duplicada detectada, ignorando...');
          return prev;
        }
        // Agregar isArchived por defecto si no viene en la notificación
        return [{ ...notification, isArchived: notification.isArchived || false }, ...prev];
      });
      
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
        
        // Actualizar la notificación con isArchived: true en lugar de eliminarla
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { 
                  ...n, 
                  isArchived: true,
                  read_status: { 
                    ...n.read_status, 
                    archived_at: new Date().toISOString() 
                  }
                }
              : n
          )
        );
        
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
        
        // Actualizar la notificación con isArchived: false
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { 
                  ...n, 
                  isArchived: false,
                  read_status: { 
                    ...n.read_status, 
                    archived_at: null 
                  }
                }
              : n
          )
        );
        
        // Actualizar conteo de no leídas
        await loadUnreadCount();
      } catch (err) {
        console.error('Error al desarchivar:', err);
        throw err;
      }
    },
    [token, loadUnreadCount]
  );

  // Eliminar notificación
  const deleteNotif = useCallback(
    async (notificationId) => {
      if (!token) return;

      try {
        await deleteNotification(token, notificationId);
        
        // Eliminar la notificación del estado local
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        
        // Si no estaba leída, decrementar el contador
        const notification = notifications.find((n) => n.id === notificationId);
        if (notification && !notification.read_status?.read_at) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (err) {
        console.error('Error al eliminar notificación:', err);
        throw err;
      }
    },
    [token, notifications]
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
    deleteNotification: deleteNotif,
    markAllRead: handleMarkAllRead,
    refreshNotifications,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
