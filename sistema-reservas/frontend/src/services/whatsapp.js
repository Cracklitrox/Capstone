import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

/**
 * Obtener alertas de reservas de WhatsApp
 */
export async function getWhatsAppBookingAlerts(token) {
  try {
    const response = await axios.get(`${API_URL}/whatsapp/booking-alerts`, {
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
