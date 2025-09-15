import axios from 'axios';

const API_URL = 'http://localhost:3001/api/v1'; 

export const authService = {
    login: async (credentials) => {
        const response = await axios.post(`${API_URL}/auth/login`, credentials);
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