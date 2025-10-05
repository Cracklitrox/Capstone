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

export const reservationsService = {
  // Buscar disponibilidad de habitaciones
  searchAvailability: async (checkInDate, checkOutDate, guests, filters = {}) => {
    const params = new URLSearchParams({
      checkInDate,
      checkOutDate,
      guests: guests.toString(),
    });

    if (filters.roomTypeId) params.append('roomTypeId', filters.roomTypeId);
    if (filters.floor) params.append('floor', filters.floor);

    const response = await axios.get(
      `${API_URL}/reservations/search-availability?${params.toString()}`,
      getAuthHeaders()
    );
    return response.data;
  },

  // Calcular precio de reserva
  calculatePrice: async (roomIds, services, checkInDate, checkOutDate, guests) => {
    const response = await axios.post(
      `${API_URL}/reservations/calculate-price`,
      { roomIds, services, checkInDate, checkOutDate, guests },
      getAuthHeaders()
    );
    return response.data;
  },

  // Obtener servicios disponibles
  getAvailableServices: async () => {
    const response = await axios.get(
      `${API_URL}/reservations/services`,
      getAuthHeaders()
    );
    return response.data;
  },

  // Crear reserva
  createReservation: async (reservationData) => {
    const response = await axios.post(
      `${API_URL}/reservations`,
      reservationData,
      getAuthHeaders()
    );
    return response.data;
  },

  // Obtener menú de desayunos
  getBreakfastMenu: async () => {
  const response = await axios.get(
    `${API_URL}/reservations/breakfast-menu`,
    getAuthHeaders()
  );
  return response.data;
},
};