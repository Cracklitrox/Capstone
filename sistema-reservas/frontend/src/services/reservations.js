import apiClient from '@/lib/apiClient';

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

    const response = await apiClient.get(
      `/reservations/search-availability?${params.toString()}`
    );
    return response.data;
  },

  // Calcular precio de reserva
  calculatePrice: async (roomIds, services, checkInDate, checkOutDate, guests) => {
    const response = await apiClient.post(
      '/reservations/calculate-price',
      { roomIds, services, checkInDate, checkOutDate, guests }
    );
    return response.data;
  },

  // Obtener servicios disponibles
  getAvailableServices: async () => {
    const response = await apiClient.get('/reservations/services');
    return response.data;
  },

  // Crear reserva
  createReservation: async (reservationData) => {
    const response = await apiClient.post('/reservations', reservationData);
    return response.data;
  },

  // Obtener menú de desayunos
  getBreakfastMenu: async () => {
    const response = await apiClient.get('/reservations/breakfast-menu');
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

    const response = await apiClient.get(
      `/reservations?${params.toString()}`
    );
    return response.data;
  },

  // Obtener reserva por ID
  getReservationById: async (id) => {
    const response = await apiClient.get(`/reservations/${id}`);
    return response.data;
  },

  // ============================================
  // ESTADOS
  // ============================================

  // Check-in
  checkIn: async (id, data = {}) => {
    const response = await apiClient.post(
      `/reservations/${id}/check-in`,
      data
    );
    return response.data;
  },

  // Check-out
  checkOut: async (id, data = {}) => {
    const response = await apiClient.post(
      `/reservations/${id}/check-out`,
      data
    );
    return response.data;
  },

  // Historial de cambios
  getHistory: async (id) => {
    const response = await apiClient.get(`/reservations/${id}/history`);
    return response.data;
  },

  // Transiciones válidas
  getValidTransitions: async (id) => {
    const response = await apiClient.get(
      `/reservations/${id}/valid-transitions`
    );
    return response.data;
  },

  // ============================================
  // PAGOS
  // ============================================

  // Obtener pagos de una reserva
  getReservationPayments: async (reservationId) => {
    const response = await apiClient.get(
      `/reservations/${reservationId}/payments`
    );
    return response.data;
  },

  // Confirmar pago
  confirmPayment: async (paymentId) => {
    const response = await apiClient.post(
      `/reservations/payments/${paymentId}/confirm`,
      {}
    );
    return response.data;
  },

  // ============================================
  // CARGOS MANUALES
  // ============================================

  // Agregar cargo manual
  addManualCharge: async (id, chargeData) => {
    const response = await apiClient.post(
      `/reservations/${id}/charges`,
      chargeData
    );
    return response.data;
  },

  // Obtener cargos manuales
  getManualCharges: async (id) => {
    const response = await apiClient.get(`/reservations/${id}/charges`);
    return response.data;
  },

  // Eliminar cargo manual
  removeManualCharge: async (id, chargeId) => {
    const response = await apiClient.delete(
      `/reservations/${id}/charges/${chargeId}`
    );
    return response.data;
  },

  // ============================================
  // EXTENSIÓN DE ESTADÍA
  // ============================================

  // Verificar disponibilidad para extensión
  checkExtensionAvailability: async (id, newCheckOutDate) => {
    const response = await apiClient.post(
      `/reservations/${id}/check-availability-extension`,
      { newCheckOutDate }
    );
    return response.data;
  },

  // Extender estadía
  extendStay: async (id, newCheckOutDate) => {
    const response = await apiClient.post(
      `/reservations/${id}/extend`,
      { newCheckOutDate }
    );
    return response.data;
  },

  // ============================================
  // MODIFICACIÓN DE HAB ITACIONES
  // ============================================

  // Upgrade de habitación
  upgradeRoom: async (id, newRoomId) => {
    const response = await apiClient.post(
      `/reservations/${id}/upgrade-room`,
      { newRoomId }
    );
    return response.data;
  },

  // Cambiar habitación (misma categoría)
  changeRoom: async (id, oldRoomId, newRoomId) => {
    const response = await apiClient.post(
      `/reservations/${id}/change-room`,
      { oldRoomId, newRoomId }
    );
    return response.data;
  },

  // ============================================
  // MODIFICACIÓN DE CHECKOUT
  // ============================================

  // Checkout anticipado
  earlyCheckout: async (id, newCheckOutDate) => {
    const response = await apiClient.post(
      `/reservations/${id}/early-checkout`,
      { newCheckOutDate }
    );
    return response.data;
  },

  // Checkout tardío
  lateCheckout: async (id, newCheckOutTime) => {
    const response = await apiClient.post(
      `/reservations/${id}/late-checkout`,
      { newCheckOutTime }
    );
    return response.data;
  },
};