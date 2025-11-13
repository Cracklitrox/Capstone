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

  // ============================================
  // GESTIÓN DE RESERVAS
  // ============================================

  // Obtener todas las reservas (con filtros)
  getAllReservations: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const response = await axios.get(
      `${API_URL}/reservations?${params.toString()}`,
      getAuthHeaders()
    );
    return response.data;
  },

  // Obtener reserva por ID
  getReservationById: async (id) => {
    const response = await axios.get(
      `${API_URL}/reservations/${id}`,
      getAuthHeaders()
    );
    return response.data;
  },

  // ============================================
  // ESTADOS
  // ============================================

  // Check-in
  checkIn: async (id, data = {}) => {
    const response = await axios.post(
      `${API_URL}/reservations/${id}/check-in`,
      data,
      getAuthHeaders()
    );
    return response.data;
  },

  // Check-out
  checkOut: async (id, data = {}) => {
    const response = await axios.post(
      `${API_URL}/reservations/${id}/check-out`,
      data,
      getAuthHeaders()
    );
    return response.data;
  },

  // Historial de cambios
  getHistory: async (id) => {
    const response = await axios.get(
      `${API_URL}/reservations/${id}/history`,
      getAuthHeaders()
    );
    return response.data;
  },

  // Transiciones válidas
  getValidTransitions: async (id) => {
    const response = await axios.get(
      `${API_URL}/reservations/${id}/valid-transitions`,
      getAuthHeaders()
    );
    return response.data;
  },

  // ============================================
  // PAGOS
  // ============================================

  // Obtener pagos de una reserva
  getReservationPayments: async (reservationId) => {
    const response = await axios.get(
      `${API_URL}/reservations/${reservationId}/payments`,
      getAuthHeaders()
    );
    return response.data;
  },

  // Confirmar pago
  confirmPayment: async (paymentId) => {
    const response = await axios.post(
      `${API_URL}/reservations/payments/${paymentId}/confirm`,
      {},
      getAuthHeaders()
    );
    return response.data;
  },

  // ============================================
  // CARGOS MANUALES
  // ============================================

  // Agregar cargo manual
  addManualCharge: async (id, chargeData) => {
    const response = await axios.post(
      `${API_URL}/reservations/${id}/charges`,
      chargeData,
      getAuthHeaders()
    );
    return response.data;
  },

  // Obtener cargos manuales
  getManualCharges: async (id) => {
    const response = await axios.get(
      `${API_URL}/reservations/${id}/charges`,
      getAuthHeaders()
    );
    return response.data;
  },

  // Eliminar cargo manual
  removeManualCharge: async (id, chargeId) => {
    const response = await axios.delete(
      `${API_URL}/reservations/${id}/charges/${chargeId}`,
      getAuthHeaders()
    );
    return response.data;
  },

  // ============================================
  // EXTENSIÓN DE ESTADÍA
  // ============================================

  // Verificar disponibilidad para extensión
  checkExtensionAvailability: async (id, newCheckOutDate) => {
    const response = await axios.post(
      `${API_URL}/reservations/${id}/check-availability-extension`,
      { newCheckOutDate },
      getAuthHeaders()
    );
    return response.data;
  },

  // Extender estadía
  extendStay: async (id, newCheckOutDate) => {
    const response = await axios.post(
      `${API_URL}/reservations/${id}/extend`,
      { newCheckOutDate },
      getAuthHeaders()
    );
    return response.data;
  },

  // ============================================
  // MODIFICACIÓN DE HABITACIONES
  // ============================================

  // Upgrade de habitación
  upgradeRoom: async (id, newRoomId) => {
    const response = await axios.post(
      `${API_URL}/reservations/${id}/upgrade-room`,
      { newRoomId },
      getAuthHeaders()
    );
    return response.data;
  },

  // Cambiar habitación (misma categoría)
  changeRoom: async (id, oldRoomId, newRoomId) => {
    const response = await axios.post(
      `${API_URL}/reservations/${id}/change-room`,
      { oldRoomId, newRoomId },
      getAuthHeaders()
    );
    return response.data;
  },

  // ============================================
  // MODIFICACIÓN DE CHECKOUT
  // ============================================

  // Checkout anticipado
  earlyCheckout: async (id, newCheckOutDate) => {
    const response = await axios.post(
      `${API_URL}/reservations/${id}/early-checkout`,
      { newCheckOutDate },
      getAuthHeaders()
    );
    return response.data;
  },

  // Checkout tardío
  lateCheckout: async (id, newCheckOutTime) => {
    const response = await axios.post(
      `${API_URL}/reservations/${id}/late-checkout`,
      { newCheckOutTime },
      getAuthHeaders()
    );
    return response.data;
  },
};