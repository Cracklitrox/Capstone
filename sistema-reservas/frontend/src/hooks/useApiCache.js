import { useRef, useCallback } from 'react';

/**
 * Hook personalizado para cachear respuestas de API y evitar peticiones duplicadas
 * Especialmente útil con React Strict Mode que monta componentes dos veces
 */
export function useApiCache(ttl = 5000) { // TTL por defecto: 5 segundos
  const cache = useRef(new Map());
  const pendingRequests = useRef(new Map());

  /**
   * Ejecuta una función de API con caché
   * @param {string} key - Clave única para identificar la petición
   * @param {Function} apiFunction - Función asíncrona que hace la petición
   * @returns {Promise} - Resultado de la API (cacheado o nuevo)
   */
  const cachedFetch = useCallback(async (key, apiFunction) => {
    const now = Date.now();
    
    // 1. Verificar si hay datos en caché válidos
    const cached = cache.current.get(key);
    if (cached && (now - cached.timestamp) < ttl) {
      return cached.data;
    }

    // 2. Verificar si ya hay una petición en curso para esta key
    if (pendingRequests.current.has(key)) {
      return pendingRequests.current.get(key);
    }

    // 3. Hacer la petición y guardarla como pendiente
    const promise = apiFunction()
      .then(data => {
        // Guardar en caché
        cache.current.set(key, {
          data,
          timestamp: Date.now()
        });
        // Limpiar petición pendiente
        pendingRequests.current.delete(key);
        return data;
      })
      .catch(error => {
        // Limpiar petición pendiente en caso de error
        pendingRequests.current.delete(key);
        throw error;
      });

    // Guardar promesa como pendiente
    pendingRequests.current.set(key, promise);
    
    return promise;
  }, [ttl]);

  /**
   * Invalida (borra) una entrada específica del caché
   */
  const invalidate = useCallback((key) => {
    cache.current.delete(key);
  }, []);

  /**
   * Limpia todo el caché
   */
  const clearAll = useCallback(() => {
    cache.current.clear();
    pendingRequests.current.clear();
  }, []);

  return { cachedFetch, invalidate, clearAll };
}
