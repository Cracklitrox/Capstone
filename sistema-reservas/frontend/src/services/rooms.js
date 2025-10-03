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

export const fetchRooms = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/rooms`, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error('Error al obtener las habitaciones:', error);
    throw new Error('Error al obtener las habitaciones');
  }
};

export const fetchRoomTypes = async () => {
  try {
    const response = await axios.get(`${API_URL}/rooms/types`, getAuthHeaders());
    return response.data;
  } catch (error) {
    console.error('Error al obtener los tipos de habitación:', error);
    throw new Error('Error al obtener los tipos de habitación');
  }
};

export const updateRoomStatus = async (roomId, newStatus, token) => {
  try {
    const response = await axios.patch(
      `${API_URL}/rooms/${roomId}/status`,
      { status: newStatus },
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    console.error('Error al actualizar el estado de la habitación:', error);
    throw new Error('Error al actualizar el estado de la habitación');
  }
};