import { useState, useEffect, useCallback } from 'react';
import { fetchCheckoutAlertsCount } from '../services/notifications';
import { useAuth } from '../hooks/useAuth';
import { useApiCache } from './useApiCache';

/**
 * Hook para obtener el conteo de checkouts pendientes
 * Se actualiza automáticamente cada 5 minutos
 */
export function useCheckoutCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user, token } = useAuth();
  const { cachedFetch } = useApiCache(5000); // 5 segundos de caché

  const fetchCount = useCallback(async () => {
    if (!user || !token || user.role !== 'receptionist') {
      setCount(0);
      setLoading(false);
      return;
    }

    try {
      // Verificar si ya fue marcado como leído hoy
      const today = new Date().toDateString();
      const readAlertsKey = `checkoutAlerts_read_${today}`;
      const isReadToday = localStorage.getItem(readAlertsKey) === 'true';

      if (isReadToday) {
        // Si ya fue marcado como leído, mostrar 0
        setCount(0);
      } else {
        // Si no, obtener el conteo del backend CON CACHÉ
        const data = await cachedFetch('checkout-count', () => fetchCheckoutAlertsCount(token));
        setCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error al obtener conteo de checkouts:', error);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [user, token, cachedFetch]);

  useEffect(() => {
    // Solo ejecutar si es recepcionista y tiene token
    if (!user || !token || user.role !== 'receptionist') {
      setCount(0);
      setLoading(false);
      return;
    }

    // Fetch inicial
    fetchCount();

    // Actualizar cada 5 minutos
    const interval = setInterval(fetchCount, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, token, fetchCount]);

  // Función para refrescar manualmente el contador
  const refetch = () => {
    fetchCount();
  };

  return { count, loading, refetch };
}
