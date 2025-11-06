import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

/**
 * Obtener alertas de reservas de WhatsApp
 * @param {string} token - Token de autenticación
 * @param {boolean} onlyUnviewed - Si es true, solo devuelve alertas no vistas
 */
export async function getWhatsAppBookingAlerts(token, onlyUnviewed = false) {
  try {
    const params = new URLSearchParams();
    if (onlyUnviewed) {
      params.append('onlyUnviewed', 'true');
    }
    
    const url = `${API_URL}/whatsapp/booking-alerts${params.toString() ? `?${params.toString()}` : ''}`;
    
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener alertas de WhatsApp:', error);
    throw error;
  }
}

/**
 * Marcar todas las alertas de WhatsApp pendientes como vistas
 */
export async function markWhatsAppAlertsAsViewed(token) {
  try {
    const response = await axios.put(
      `${API_URL}/whatsapp/mark-as-viewed`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error al marcar alertas como vistas:', error);
    throw error;
  }
}

/**
 * Rechazar una solicitud de reserva de WhatsApp
 * @param {string} token - Token de autenticación
 * @param {number} alertId - ID de la alerta a rechazar
 * @param {string} reason - Razón del rechazo (opcional)
 */
export async function rejectWhatsAppBookingAlert(token, alertId, reason = '') {
  try {
    const response = await axios.put(
      `${API_URL}/whatsapp/booking-alerts/${alertId}/reject`,
      { reason },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error al rechazar solicitud de WhatsApp:', error);
    throw error;
  }
}

/**
 * Confirmar una solicitud de reserva de WhatsApp
 * @param {string} token - Token de autenticación
 * @param {number} alertId - ID de la alerta a confirmar
 */
export async function confirmWhatsAppBookingAlert(token, alertId) {
  try {
    const response = await axios.put(
      `${API_URL}/whatsapp/booking-alerts/${alertId}/confirm`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error al confirmar solicitud de WhatsApp:', error);
    throw error;
  }
}
