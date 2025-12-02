import apiClient from '@/lib/apiClient';

export const authService = {
    login: async (credentials) => {
        // Login no necesita auth header
        const response = await apiClient.post('/auth/login', credentials);
        return response.data;
    },
    changePassword: async (passwordData) => {
        const response = await apiClient.put('/auth/change-password', passwordData);
        return response.data;
    },
    getLoginHistory: async () => {
        const response = await apiClient.get('/auth/login-history');
        return response.data;
    },
};

export const reservationService = {
    getReservations: async () => {
        const response = await apiClient.get('/reservations');
        return response.data;
    },
    createReservation: async (reservationData) => {
        const response = await apiClient.post('/reservations', reservationData);
        return response.data;
    }
};
