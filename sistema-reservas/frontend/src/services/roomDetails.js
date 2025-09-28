export async function fetchRoomDetails(id, token) {
  const response = await fetch(`http://localhost:3001/api/v1/rooms/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('No se pudo obtener detalles de la habitación');
  }
  return response.json();
}