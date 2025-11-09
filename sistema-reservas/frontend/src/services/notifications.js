/**
 * Servicio de API para Notificaciones de Check-out y Notificaciones en Tiempo Real
 * Maneja las peticiones al backend para alertas de check-out y notificaciones
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// ==================== NOTIFICACIONES EN TIEMPO REAL ====================

/**
 * Crea una nueva notificación
 * @param {string} token - JWT token de autenticación
 * @param {Object} notificationData - Datos de la notificación
 * @returns {Promise<Object>} Notificación creada
 */
export async function createNotification(token, notificationData) {
  const response = await fetch(`${API_BASE_URL}/notifications`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(notificationData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al crear la notificación');
  }

  return response.json();
}

/**
 * Obtiene todas las notificaciones del usuario
 * @param {string} token - JWT token de autenticación
 * @param {Object} filters - Filtros opcionales (status, archived, limit, offset)
 * @returns {Promise<Object>} Lista de notificaciones
 */
export async function getUserNotifications(token, filters = {}) {
  const queryParams = new URLSearchParams();
  
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.archived !== undefined) queryParams.append('archived', filters.archived);
  if (filters.limit) queryParams.append('limit', filters.limit);
  if (filters.offset) queryParams.append('offset', filters.offset);

  const url = `${API_BASE_URL}/notifications${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al obtener las notificaciones');
  }

  return response.json();
}

/**
 * Marca una notificación como leída
 * @param {string} token - JWT token de autenticación
 * @param {number} notificationId - ID de la notificación
 * @returns {Promise<Object>} Resultado de la operación
 */
export async function markNotificationAsRead(token, notificationId) {
  const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al marcar como leída');
  }

  return response.json();
}

/**
 * Marca una notificación como archivada
 * @param {string} token - JWT token de autenticación
 * @param {number} notificationId - ID de la notificación
 * @returns {Promise<Object>} Resultado de la operación
 */
export async function markNotificationAsArchived(token, notificationId) {
  const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/archive`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al archivar la notificación');
  }

  return response.json();
}

/**
 * Desmarca una notificación archivada
 * @param {string} token - JWT token de autenticación
 * @param {number} notificationId - ID de la notificación
 * @returns {Promise<Object>} Resultado de la operación
 */
export async function unarchiveNotification(token, notificationId) {
  const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/unarchive`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al desarchivar la notificación');
  }

  return response.json();
}

/**
 * Elimina una notificación
 * @param {string} token - JWT token de autenticación
 * @param {number} notificationId - ID de la notificación
 * @returns {Promise<Object>} Resultado de la operación
 */
export async function deleteNotification(token, notificationId) {
  const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al eliminar la notificación');
  }

  return response.json();
}

/**
 * Obtiene el conteo de notificaciones no leídas
 * @param {string} token - JWT token de autenticación
 * @returns {Promise<Object>} Conteo de notificaciones no leídas
 */
export async function getUnreadCount(token) {
  const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al obtener el conteo');
  }

  return response.json();
}

/**
 * Marca todas las notificaciones como leídas
 * @param {string} token - JWT token de autenticación
 * @returns {Promise<Object>} Resultado de la operación
 */
export async function markAllAsRead(token) {
  const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al marcar todas como leídas');
  }

  return response.json();
}

/**
 * Obtiene usuarios activos por rol (excluyendo al usuario actual)
 * @param {string} token - JWT token de autenticación
 * @param {number} roleId - ID del rol
 * @returns {Promise<Object>} Lista de usuarios
 */
export async function getUsersByRole(token, roleId) {
  const response = await fetch(`${API_BASE_URL}/notifications/users-by-role/${roleId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al obtener usuarios');
  }

  return response.json();
}

/**
 * Obtiene estadísticas de lectura de una notificación
 * @param {string} token - JWT token de autenticación
 * @param {number} notificationId - ID de la notificación
 * @returns {Promise<Object>} Estadísticas de lectura (quién leyó y quién no)
 */
export async function getNotificationReadStats(token, notificationId) {
  const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read-stats`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al obtener estadísticas de lectura');
  }

  return response.json();
}

// ==================== ALERTAS ====================

/**
 * Obtiene el conteo de todas las alertas agrupadas por tipo
 * @param {string} token - JWT token de autenticación
 * @returns {Promise<Object>} Objeto con conteos por tipo de alerta
 */
export async function getAllAlertsCount(token) {
  const response = await fetch(`${API_BASE_URL}/notifications/alerts-count`, {
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

// ==================== ALERTAS DE CHECK-OUT ====================

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

/**
 * Obtiene check-outs pasados
 * @param {string} token - JWT token de autenticación
 * @param {number} days - Número de días hacia atrás (default: 7)
 * @returns {Promise<Object>} Objeto con los checkouts pasados
 */
export async function fetchPastCheckouts(token, days = 7) {
  const response = await fetch(`${API_BASE_URL}/notifications/past-checkouts?days=${days}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al obtener checkouts pasados');
  }

  return response.json();
}

/**
 * Obtiene check-outs futuros
 * @param {string} token - JWT token de autenticación
 * @param {number} days - Número de días hacia adelante (default: 7)
 * @returns {Promise<Object>} Objeto con los checkouts futuros
 */
export async function fetchFutureCheckouts(token, days = 7) {
  const response = await fetch(`${API_BASE_URL}/notifications/future-checkouts?days=${days}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al obtener checkouts futuros');
  }

  return response.json();
}

