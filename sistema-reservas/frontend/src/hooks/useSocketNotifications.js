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
      console.log("⏸️ WebSocket: Esperando autenticación");
      return;
    }

    if (user.role !== "receptionist") {
      console.log(
        "⏸️ WebSocket: Usuario no es recepcionista, no se conecta"
      );
      return;
    }

    console.log("🔌 Iniciando conexión WebSocket...");
    console.log("🔌 Usuario:", user);
    console.log("🔌 Rol del usuario:", user.role);
    console.log("🔌 Token presente:", !!token);

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
      console.log("✅ WebSocket conectado correctamente");
      console.log("✅ Socket ID:", socketInstance.id);
      console.log("✅ Rol del usuario:", user.role);
      console.log("✅ Transportes activos:", socketInstance.io.engine.transport.name);
      setIsConnected(true);
      reconnectAttempts.current = 0;

      // Solicitar datos iniciales al conectar
      console.log("📤 Solicitando datos iniciales...");
      socketInstance.emit("checkout:requestUpdate");
      console.log("📤 Emitido: checkout:requestUpdate");
      socketInstance.emit("whatsapp:requestUpdate");
      console.log("📤 Emitido: whatsapp:requestUpdate");
    });

    // ⭐ DEBUG: Escuchar TODOS los eventos para diagnóstico
    socketInstance.onAny((eventName, ...args) => {
      console.log(`🔔 Evento recibido: "${eventName}"`, args);
    });

    // ⭐ Evento: Recibir actualización de checkouts
    socketInstance.on("checkout:update", (data) => {
      console.log("📬 Notificación de checkout recibida:", data);
      console.log("📬 Contador recibido del backend:", data.count);
      
      // Actualizar el contador directamente
      setCheckoutCount(data.count || 0);
    });

    // ⭐ Evento: Recibir actualización de WhatsApp
    socketInstance.on("whatsapp:update", (data) => {
      console.log("📬 Notificación de WhatsApp recibida:", data);
      console.log("📬 Contador recibido del backend:", data.count);
      
      setWhatsappCount(data.count || 0);
    });

    // ⭐ Evento: Error de checkout
    socketInstance.on("checkout:error", (error) => {
      console.error("❌ Error en checkout alerts:", error);
    });

    // ⭐ Evento: Desconexión
    socketInstance.on("disconnect", (reason) => {
      console.log(`❌ WebSocket desconectado (razón: ${reason})`);
      setIsConnected(false);

      if (reason === "io server disconnect") {
        // El servidor desconectó al cliente, reconectar manualmente
        socketInstance.connect();
      }
    });

    // ⭐ Evento: Error de conexión
    socketInstance.on("connect_error", (error) => {
      reconnectAttempts.current += 1;
      console.error(
        `❌ Error de conexión WebSocket (intento ${reconnectAttempts.current}/${maxReconnectAttempts}):`,
        error.message
      );

      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.error("❌ Máximo de intentos de reconexión alcanzado");
        socketInstance.close();
      }
    });

    // ⭐ Evento: Reconexión exitosa
    socketInstance.on("reconnect", (attemptNumber) => {
      console.log(
        `✅ Reconexión exitosa después de ${attemptNumber} intento(s)`
      );
      reconnectAttempts.current = 0;
    });

    setSocket(socketInstance);

    // ⭐ Listener para evento personalizado: alertas marcadas como vistas
    const handleAlertsViewed = () => {
      console.log("📖 Alertas marcadas como vistas, actualizando contador...");
      
      // Solicitar actualización del contador
      socketInstance.emit("whatsapp:requestUpdate");
    };

    window.addEventListener('whatsappAlertsViewed', handleAlertsViewed);

    // Cleanup al desmontar el componente
    return () => {
      console.log("🔌 Cerrando conexión WebSocket...");
      window.removeEventListener('whatsappAlertsViewed', handleAlertsViewed);
      socketInstance.disconnect();
    };
  }, [token, user]);

  // Función para solicitar actualización manual
  const requestUpdate = useCallback(() => {
    if (socket && isConnected) {
      console.log("🔄 Solicitando actualización manual de notificaciones...");
      socket.emit("checkout:requestUpdate");
      socket.emit("whatsapp:requestUpdate");
    } else {
      console.warn(
        "⚠️ No se puede solicitar actualización: WebSocket no conectado"
      );
    }
  }, [socket, isConnected]);

  const totalCount = checkoutCount + whatsappCount;

  // Debug: Log cuando cambien los contadores
  useEffect(() => {
    console.log('🔢 Contadores actualizados en hook:', {
      checkoutCount,
      whatsappCount,
      totalCount
    });
  }, [checkoutCount, whatsappCount, totalCount]);

  return {
    checkoutCount,
    whatsappCount,
    totalCount,
    isConnected,
    requestUpdate,
  };
}
