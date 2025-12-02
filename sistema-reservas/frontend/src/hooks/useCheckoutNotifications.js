import { useEffect, useState, useCallback } from 'react';

/**
 * Hook personalizado para manejar notificaciones del navegador
 * para alertas de check-out
 */
export function useCheckoutNotifications() {
  const [permission, setPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'denied'
  );

  // Solicitar permisos de notificación
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      return 'denied';
    }
  }, []);

  // Mostrar notificación
  const showNotification = useCallback(
    (title, options = {}) => {
      if (!('Notification' in window)) {
        return null;
      }

      if (Notification.permission !== 'granted') {
        return null;
      }

      try {
        const notification = new Notification(title, {
          icon: '/logo192.png', // Usa el logo de tu aplicación
          badge: '/logo192.png',
          ...options,
        });

        return notification;
      } catch (error) {
        return null;
      }
    },
    []
  );

  // Mostrar notificación de check-outs
  const notifyCheckouts = useCallback(
    (count, onClickCallback) => {
      if (count === 0) return null;

      const title = `🔔 ${count} Check-out${count > 1 ? 's' : ''} Pendiente${count > 1 ? 's' : ''}`;
      const body = `Hay ${count} habitación${count > 1 ? 'es' : ''} con check-out programado para hoy a las 11:00 AM.`;

      const notification = showNotification(title, {
        body,
        tag: 'checkout-alert', // Evita duplicados
        requireInteraction: true, // Mantiene la notificación hasta que se cierre
        vibrate: [200, 100, 200], // Vibración en dispositivos móviles
      });

      if (notification && onClickCallback) {
        notification.onclick = () => {
          onClickCallback();
          notification.close();
        };
      }

      return notification;
    },
    [showNotification]
  );

  return {
    permission,
    requestPermission,
    showNotification,
    notifyCheckouts,
  };
}

/**
 * Hook para verificar si es hora de mostrar la alerta (desde 9:00 AM en adelante)
 * La alerta se mantiene visible hasta que el recepcionista la marque como leída
 * @param {number} alertHour - Hora de inicio de alerta (default: 9)
 */
export function useAlertTime(alertHour = 9) {
  const [shouldAlert, setShouldAlert] = useState(false);

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const today = now.toDateString();
      
      // ⭐ Alertar desde las 9:00 AM en adelante (sin límite superior)
      const isPastAlertHour = currentHour >= alertHour;
      
      if (isPastAlertHour) {
        // Verificar si ya fue marcada como leída hoy
        const readAlertsKey = `checkoutAlerts_read_${today}`;
        const isReadToday = localStorage.getItem(readAlertsKey) === 'true';

        if (!isReadToday) {
          setShouldAlert(true);
        } else {
          setShouldAlert(false);
        }
      } else {
        // Antes de las 9 AM, no mostrar alerta
        setShouldAlert(false);
      }
    };

    // Verificar inmediatamente
    checkTime();

    // Verificar cada minuto
    const interval = setInterval(checkTime, 60 * 1000);

    return () => clearInterval(interval);
  }, [alertHour]);

  // Función para marcar la alerta como leída
  const markAsRead = useCallback(() => {
    const today = new Date().toDateString();
    const readAlertsKey = `checkoutAlerts_read_${today}`;
    localStorage.setItem(readAlertsKey, 'true');
    setShouldAlert(false);
  }, []);

  const resetAlert = useCallback(() => {
    setShouldAlert(false);
  }, []);

  return { shouldAlert, resetAlert, markAsRead };
}
