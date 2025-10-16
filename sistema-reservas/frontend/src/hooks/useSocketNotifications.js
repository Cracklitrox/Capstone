import { useEffect, useState, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from './useAuth';

// URL del servidor WebSocket (ajustar según configuración)
const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace("/api/v1", "") ||
  "http://localhost:3001";

/**
 * Hook para gestionar notificaciones de checkout via WebSocket
 * @returns {Object} { checkoutCount, isConnected, requestUpdate }
 */
export function useSocketNotifications() {
  const [socket, setSocket] = useState(null);
  const [checkoutCount, setCheckoutCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const { token, user } = useAuth();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    // Solo conectar si el usuario es recepcionista o admin
    if (!token || !user) {
      console.log("⏸️ WebSocket: Esperando autenticación");
      return;
    }

    if (user.role !== "receptionist" && user.role !== "administrator") {
      console.log(
        "⏸️ WebSocket: Usuario no es recepcionista/admin, no se conecta"
      );
      return;
    }

    console.log("🔌 Iniciando conexión WebSocket...");

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
      setIsConnected(true);
      reconnectAttempts.current = 0;

      // Solicitar datos iniciales al conectar
      socketInstance.emit("checkout:requestUpdate");
    });

    // ⭐ Evento: Recibir actualización de checkouts
    socketInstance.on("checkout:update", (data) => {
      console.log("📬 Notificación recibida via WebSocket:", data);

      // Verificar si ya fue marcada como leída hoy
      const today = new Date().toDateString();
      const readAlertsKey = `checkoutAlerts_read_${today}`;
      const isReadToday = localStorage.getItem(readAlertsKey) === "true";

      if (!isReadToday) {
        setCheckoutCount(data.count || 0);
      } else {
        setCheckoutCount(0);
      }
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

    // Cleanup al desmontar el componente
    return () => {
      console.log("🔌 Cerrando conexión WebSocket...");
      socketInstance.disconnect();
    };
  }, [token, user]);

  // Función para solicitar actualización manual
  const requestUpdate = useCallback(() => {
    if (socket && isConnected) {
      console.log("🔄 Solicitando actualización manual de notificaciones...");
      socket.emit("checkout:requestUpdate");
    } else {
      console.warn(
        "⚠️ No se puede solicitar actualización: WebSocket no conectado"
      );
    }
  }, [socket, isConnected]);

  return {
    checkoutCount,
    isConnected,
    requestUpdate,
  };
}
