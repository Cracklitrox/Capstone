// Servicio para obtener todas las habitaciones desde el backend
export async function fetchRooms() {
  const response = await fetch('http://localhost:3001/api/v1/rooms');
  if (!response.ok) {
    throw new Error('Error al obtener habitaciones');
  }
  return response.json();
}
