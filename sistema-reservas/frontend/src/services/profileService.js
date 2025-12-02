import apiClient from '@/lib/apiClient';

export const profileService = {
  // Obtener actividad reciente del usuario
  getMyActivity: async (limit = 15) => {
    const response = await apiClient.get(
      `/staff/my-activity?limit=${limit}`
    );
    return response.data;
  },

  // Obtener preferencias del usuario
  getMyPreferences: async () => {
    const response = await apiClient.get('/staff/my-preferences');
    return response.data;
  },

  // Actualizar preferencias del usuario
  updateMyPreferences: async (preferences) => {
    const response = await apiClient.put(
      '/staff/my-preferences',
      preferences
    );
    return response.data;
  },
};