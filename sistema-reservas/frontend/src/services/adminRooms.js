import apiClient from '@/lib/apiClient';

// Funciones de lectura - usando rutas públicas (solo requieren autenticación)
export async function fetchAdminRooms() {
  const response = await apiClient.get('/rooms');
  return response.data;
}

export async function fetchAdminRoomTypes() {
  const response = await apiClient.get('/rooms/types');
  return response.data;
}

export async function createAdminRoom(data) {
  const response = await apiClient.post('/admin/rooms', data);
  return response.data;
}

export async function createAdminRoomType(data) {
  const response = await apiClient.post('/admin/rooms/room-types', data);
  return response.data;
}

export async function updateAdminRoom(id, data) {
  const response = await apiClient.put(`/admin/rooms/${id}`, data);
  return response.data;
}

export async function updateAdminRoomType(id, data) {
  const response = await apiClient.put(`/admin/rooms/room-types/${id}`, data);
  return response.data;
}

export async function deleteAdminRoom(id) {
  await apiClient.delete(`/admin/rooms/${id}`);
  return true;
}

export async function deleteAdminRoomType(id) {
  await apiClient.delete(`/admin/rooms/room-types/${id}`);
  return true;
}
