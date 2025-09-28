import { format } from 'date-fns';

/**
 * Obtiene los datos de ocupación para el Tape Chart desde la API.
 * @param {Date} startDate - Fecha de inicio del rango.
 * @param {Date} endDate - Fecha de fin del rango.
 * @param {string} token - El token JWT para autenticación.
 * @returns {Promise<Array>} - Un array de habitaciones con sus reservas.
 */
export async function getPlanningData(startDate, endDate, token) {
  // Formateamos las fechas al formato YYYY-MM-DD que espera la API.
  const formattedStartDate = format(startDate, 'yyyy-MM-dd');
  const formattedEndDate = format(endDate, 'yyyy-MM-dd');

  const response = await fetch(
    `http://localhost:3001/api/v1/planning/tape-chart?startDate=${formattedStartDate}&endDate=${formattedEndDate}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Error al obtener los datos de planificación');
  }

  return response.json();
}