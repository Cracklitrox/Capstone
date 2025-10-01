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

export const authService = {
    login: async (credentials) => {
        const response = await axios.post(`${API_URL}/auth/login`, credentials);
        return response.data;
    },
    changePassword: async (passwordData) => {
      const response = await axios.put(`${API_URL}/auth/change-password`, passwordData, getAuthHeaders());
      return response.data;
    },
    getLoginHistory: async () => {
      const response = await axios.get(`${API_URL}/auth/login-history`, getAuthHeaders());
      return response.data;
    },
};

export const reservationService = {
    getReservations: async () => {
        const response = await axios.get(`${API_URL}/reservations`);
        return response.data;
    },
    createReservation: async (reservationData) => {
        const response = await axios.post(`${API_URL}/reservations`, reservationData);
        return response.data;
    }
};