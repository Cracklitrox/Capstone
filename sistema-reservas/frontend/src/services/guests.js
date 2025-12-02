import apiClient from "@/lib/apiClient";

export const guestsService = {
  // Buscar huésped por número de identificación
  searchByIdentification: async (identificationNumber) => {
    const response = await apiClient.get(
      `/guests/search/${identificationNumber}`
    );
    return response.data;
  },

  // Crear nuevo huésped
  createGuest: async (guestData) => {
    const response = await apiClient.post('/guests', guestData);
    return response.data;
  },

  // Actualizar huésped
  updateGuest: async (guestId, guestData) => {
    const response = await apiClient.put(
      `/guests/${guestId}`,
      guestData
    );
    return response.data;
  },
};
