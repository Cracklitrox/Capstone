import axios from "axios";

const API_URL = "http://localhost:3001/api/v1";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const guestHistoryService = {
  // Buscar todos los huéspedes (lista/búsqueda)
  searchAllGuests: async (searchTerm = "", page = 1, limit = 20) => {
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await axios.get(
        `${API_URL}/guests?${params}`,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error("Error al buscar huéspedes:", error);
      throw new Error(
        error.response?.data?.message || "Error al buscar huéspedes"
      );
    }
  },

  // Obtener perfil completo de huésped
  getGuestProfile: async (guestId) => {
    try {
      const response = await axios.get(
        `${API_URL}/guests/${guestId}/profile`,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error("Error al obtener perfil de huésped:", error);
      throw new Error(
        error.response?.data?.message || "Error al obtener perfil de huésped"
      );
    }
  },

  // Obtener historial de reservas de huésped
  getGuestReservations: async (guestId, filters = {}) => {
    try {
      const params = new URLSearchParams();

      if (filters.page) params.append("page", filters.page.toString());
      if (filters.limit) params.append("limit", filters.limit.toString());
      if (filters.status) params.append("status", filters.status);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const response = await axios.get(
        `${API_URL}/guests/${guestId}/reservations?${params}`,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error("Error al obtener historial de reservas:", error);
      throw new Error(
        error.response?.data?.message ||
          "Error al obtener historial de reservas"
      );
    }
  },

  // Actualizar observaciones de huésped
  updateGuestObservations: async (guestId, observations) => {
    try {
      const response = await axios.put(
        `${API_URL}/guests/${guestId}/observations`,
        { observations },
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error("Error al actualizar observaciones:", error);
      throw new Error(
        error.response?.data?.message || "Error al actualizar observaciones"
      );
    }
  },

  // Actualizar campo específico del perfil de huésped
  updateGuestProfile: async (guestId, updateData) => {
    try {
      const response = await axios.put(
        `${API_URL}/guests/${guestId}/profile`,
        updateData,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error("Error al actualizar perfil de huésped:", error);
      throw new Error(
        error.response?.data?.message || "Error al actualizar perfil de huésped"
      );
    }
  },

  // Eliminar huésped (soft delete) - Solo Admin
  deleteGuest: async (guestId) => {
    try {
      const response = await axios.delete(
        `${API_URL}/guests/${guestId}`,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error("Error al eliminar huésped:", error);
      throw new Error(
        error.response?.data?.message || "Error al eliminar huésped"
      );
    }
  },
};
