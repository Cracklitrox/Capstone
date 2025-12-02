import apiClient from "@/lib/apiClient";

export const guestHistoryService = {
  // Buscar todos los huéspedes (lista/búsqueda)
  searchAllGuests: async (searchTerm = "", page = 1, limit = 20) => {
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await apiClient.get(`/guests?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Error al buscar huéspedes"
      );
    }
  },

  // Obtener perfil completo de huésped
  getGuestProfile: async (guestId) => {
    try {
      const response = await apiClient.get(`/guests/${guestId}/profile`);
      return response.data;
    } catch (error) {
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

      const response = await apiClient.get(
        `/guests/${guestId}/reservations?${params}`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message ||
        "Error al obtener historial de reservas"
      );
    }
  },

  // Actualizar observaciones de huésped
  updateGuestObservations: async (guestId, observations) => {
    try {
      const response = await apiClient.put(
        `/guests/${guestId}/observations`,
        { observations }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Error al actualizar observaciones"
      );
    }
  },

  // Actualizar campo específico del perfil de huésped
  updateGuestProfile: async (guestId, updateData) => {
    try {
      const response = await apiClient.put(
        `/guests/${guestId}/profile`,
        updateData
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Error al actualizar perfil de huésped"
      );
    }
  },

  // Eliminar huésped (soft delete) - Solo Admin
  deleteGuest: async (guestId) => {
    try {
      const response = await apiClient.delete(`/guests/${guestId}`);
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Error al eliminar huésped"
      );
    }
  },
};
