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

export const guestsService = {
  // Buscar huésped por RUT
  searchByRut: async (rut, rutDv) => {
    const response = await axios.get(
      `${API_URL}/guests/search/${rut}/${rutDv}`,
      getAuthHeaders()
    );
    return response.data;
  },

  // Crear nuevo huésped
  createGuest: async (guestData) => {
    const response = await axios.post(
      `${API_URL}/guests`,
      guestData,
      getAuthHeaders()
    );
    return response.data;
  },

  // Actualizar huésped
  updateGuest: async (guestId, guestData) => {
    const response = await axios.put(
      `${API_URL}/guests/${guestId}`,
      guestData,
      getAuthHeaders()
    );
    return response.data;
  },
};