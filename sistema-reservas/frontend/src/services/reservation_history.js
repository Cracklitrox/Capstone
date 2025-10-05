const API_URL = 'http://localhost:3001/api/v1';

/**
 * Obtiene la lista paginada y filtrada del historial de reservas.
 * @param {object} filters - Objeto con los filtros (rut, roomId, page, etc.).
 * @param {string} token - Token de autenticación.
 */
export const getReservationHistory = async (filters, token) => {
  // Construimos la cadena de parámetros para la URL, omitiendo los vacíos
  const activeFilters = {};
  for (const key in filters) {
    if (filters[key]) {
      activeFilters[key] = filters[key];
    }
  }
  const queryParams = new URLSearchParams(activeFilters).toString();
  
  const response = await fetch(`${API_URL}/reservation_history?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error al obtener el historial.');
  }

  return response.json();
};

/**
 * Obtiene los detalles completos de una reserva específica.
 * @param {number} reservationId - El ID de la reserva.
 * @param {string} token - Token de autenticación.
 */
export const getReservationDetailsById = async (reservationId, token) => {
  const response = await fetch(`${API_URL}/reservation_history/${reservationId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Error al obtener los detalles de la reserva.');
  }

  return response.json();
};