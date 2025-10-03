/**
 * Servicio de API para Notificaciones de Check-out
 * Maneja las peticiones al backend para alertas de check-out
 */

const API_BASE_URL = 'http://localhost:3001/api/v1';

/**
 * Obtiene todas las alertas de check-out para el día actual
 * @param {string} token - JWT token de autenticación
 * @returns {Promise<Object>} Objeto con las alertas y metadata
 */
export async function fetchCheckoutAlerts(token) {
  const response = await fetch(`${API_BASE_URL}/notifications/checkout-alerts`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al obtener las alertas de check-out');
  }

  return response.json();
}

/**
 * Obtiene solo el conteo de alertas de check-out (para badge)
 * @param {string} token - JWT token de autenticación
 * @returns {Promise<Object>} Objeto con el conteo y metadata
 */
export async function fetchCheckoutAlertsCount(token) {
  const response = await fetch(`${API_BASE_URL}/notifications/checkout-count`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al obtener el conteo de alertas');
  }

  return response.json();
}
