import axios from 'axios';

const API_URL = 'http://localhost:3001/api/v1';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const profileService = {
  // Obtener actividad reciente del usuario
  getMyActivity: async (limit = 15) => {
    const response = await axios.get(
      `${API_URL}/staff/my-activity?limit=${limit}`,
      getAuthHeaders()
    );
    return response.data;
  },

  // Obtener preferencias del usuario
  getMyPreferences: async () => {
    const response = await axios.get(
      `${API_URL}/staff/my-preferences`,
      getAuthHeaders()
    );
    return response.data;
  },

  // Actualizar preferencias del usuario
  updateMyPreferences: async (preferences) => {
    const response = await axios.put(
      `${API_URL}/staff/my-preferences`,
      preferences,
      getAuthHeaders()
    );
    return response.data;
  },
};