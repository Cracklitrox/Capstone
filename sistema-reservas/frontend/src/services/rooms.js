import apiClient from '@/lib/apiClient';

export const fetchRooms = async () => {
  try {
    const response = await apiClient.get('/rooms');
    return response.data;
  } catch (error) {
    throw new Error('Error al obtener las habitaciones');
  }
};

export const fetchRoomTypes = async () => {
  try {
    const response = await apiClient.get('/rooms/types');
    return response.data;
  } catch (error) {
    throw new Error('Error al obtener los tipos de habitación');
  }
};

export const updateRoomStatus = async (roomId, newStatus) => {
  try {
    const response = await apiClient.patch(
      `/rooms/${roomId}/status`,
      { status: newStatus }
    );
    return response.data;
  } catch (error) {
    throw new Error('Error al actualizar el estado de la habitación');
  }
};