// Servicio para obtener detalles de una habitación específica
export async function fetchRoomDetails(id) {
  const response = await fetch(`http://localhost:3001/api/v1/rooms/${id}`);
  if (!response.ok) {
    throw new Error('No se pudo obtener detalles de la habitación');
  }
  return response.json();
}
