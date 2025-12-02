import { useEffect, useState, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from './useAuth';

// URL del servidor WebSocket (ajustar según configuración)
const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace("/api/v1", "") ||
  "http://localhost:3001";

/**
 * Hook para gestionar notificaciones de checkout y WhatsApp via WebSocket
 * @returns {Object} { checkoutCount, whatsappCount, totalCount, isConnected, requestUpdate }
 */
export function useSocketNotifications() {
  const [socket, setSocket] = useState(null);
  const [checkoutCount, setCheckoutCount] = useState(0);
  const [whatsappCount, setWhatsappCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const { token, user } = useAuth();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    // Solo conectar si el usuario es recepcionista
    if (!token || !user) {
      return;
    }

    if (user.role !== "receptionist") {
      return;
    }


    // Crear conexión Socket.IO con autenticación
    const socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts,
    });

    // ⭐ Evento: Conexión establecida
    socketInstance.on("connect", () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;

      // Solicitar datos iniciales al conectar
      socketInstance.emit("checkout:requestUpdate");
      socketInstance.emit("whatsapp:requestUpdate");
    });

    // ⭐ DEBUG: Escuchar TODOS los eventos para diagnóstico
    socketInstance.onAny((eventName, ...args) => {
    });

    // ⭐ Evento: Recibir actualización de checkouts
    socketInstance.on("checkout:update", async (data) => {

      // Solicitar el count filtrado para este usuario desde el backend
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/notifications/checkout-count`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          setCheckoutCount(result.count || 0);
        } else {
          setCheckoutCount(0);
        }
      } catch (error) {
        setCheckoutCount(0);
      }
    });

    // ⭐ Evento: Recibir actualización de WhatsApp
    socketInstance.on("whatsapp:update", (data) => {

      setWhatsappCount(data.count || 0);
    });

    // ⭐ Evento: Error de checkout
    socketInstance.on("checkout:error", (error) => {
    });

    // ⭐ Evento: Desconexión
    socketInstance.on("disconnect", (reason) => {
      setIsConnected(false);

      if (reason === "io server disconnect") {
        // El servidor desconectó al cliente, reconectar manualmente
        socketInstance.connect();
      }
    });

    // ⭐ Evento: Error de conexión
    socketInstance.on("connect_error", (error) => {
      reconnectAttempts.current += 1;

      if (reconnectAttempts.current >= maxReconnectAttempts) {
        socketInstance.close();
      }
    });

    // ⭐ Evento: Reconexión exitosa
    socketInstance.on("reconnect", (attemptNumber) => {
      reconnectAttempts.current = 0;
    });

    setSocket(socketInstance);

    // ⭐ Listener para evento personalizado: alertas de WhatsApp marcadas como vistas
    const handleWhatsAppAlertsViewed = () => {

      // Solicitar actualización del contador
      socketInstance.emit("whatsapp:requestUpdate");
    };

    // ⭐ Listener para evento personalizado: alertas de checkout limpiadas
    const handleCheckoutAlertsCleared = async () => {

      // Limpiar el contador localmente (el marcado en BD ya se hizo en AlertsBell)
      setCheckoutCount(0);

    };

    window.addEventListener('whatsappAlertsViewed', handleWhatsAppAlertsViewed);
    window.addEventListener('checkoutAlertsCleared', handleCheckoutAlertsCleared);

    // Cleanup al desmontar el componente
    return () => {
      window.removeEventListener('whatsappAlertsViewed', handleWhatsAppAlertsViewed);
      window.removeEventListener('checkoutAlertsCleared', handleCheckoutAlertsCleared);
      socketInstance.disconnect();
    };
  }, [token, user]);

  // Función para solicitar actualización manual
  const requestUpdate = useCallback(async () => {
    if (socket && isConnected && token) {

      // Solicitar count de checkouts actualizado
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/notifications/checkout-count`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const result = await response.json();
          setCheckoutCount(result.count || 0);
        }
      } catch (error) {
      }

      // Solicitar actualización de WhatsApp via socket
      socket.emit("whatsapp:requestUpdate");
    }
  }, [socket, isConnected, token]);

  const totalCount = checkoutCount + whatsappCount;

  // Cargar el count inicial de checkouts filtrado por usuario
  useEffect(() => {
    if (token && user && user.role === 'receptionist') {
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'}/notifications/checkout-count`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
        .then((response) => response.json())
        .then((result) => {
          setCheckoutCount(result.count || 0);
        })
        .catch((error) => {
        });
    }
  }, [token, user]);

  // Debug: Log cuando cambien los contadores
  useEffect(() => {
    // Efecto para rastrear cambios en los contadores
  }, [checkoutCount, whatsappCount, totalCount]);

  return {
    checkoutCount,
    whatsappCount,
    totalCount,
    isConnected,
    requestUpdate,
  };
}
