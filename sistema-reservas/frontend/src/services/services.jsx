import axios from 'axios';

const API_URL = 'http://localhost:3000/api'; // Cambia la URL según tu backend

const reservationService = {
    getReservations: async () => {
        const response = await axios.get(`${API_URL}/reservations`);
        return response.data;
    },

    createReservation: async (reservationData) => {
        const response = await axios.post(`${API_URL}/reservations`, reservationData);
        return response.data;
    }
};

export default reservationService;