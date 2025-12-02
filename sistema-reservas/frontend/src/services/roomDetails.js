import apiClient from '@/lib/apiClient';

export async function fetchRoomDetails(id) {
  const response = await apiClient.get(`/rooms/${id}`);
  return response.data;
}