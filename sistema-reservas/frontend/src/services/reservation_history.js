import apiClient from "@/lib/apiClient";

/**
 * Obtiene la lista paginada y filtrada del historial de reservas.
 * @param {object} filters - Objeto con los filtros (rut, roomId, reservation, guest, etc.).
 */
export const getReservationHistory = async (filters) => {
  // Construimos la cadena de parámetros para la URL, omitiendo los vacíos
  const activeFilters = {};
  for (const key in filters) {
    if (filters[key]) {
      activeFilters[key] = filters[key];
    }
  }
  const queryParams = new URLSearchParams(activeFilters).toString();

  const response = await apiClient.get(
    `/reservation_history?${queryParams}`
  );
  return response.data;
};

/**
 * Obtiene los detalles completos de una reserva específica.
 * @param {number} reservationId - El ID de la reserva.
 */
export const getReservationDetailsById = async (reservationId) => {
  const response = await apiClient.get(`/reservation_history/${reservationId}`);
  return response.data;
};
