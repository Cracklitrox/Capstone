export async function fetchRooms(token) {
  const response = await fetch('http://localhost:3001/api/v1/rooms', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('Error al obtener habitaciones');
  }
  return response.json();
}

export async function fetchRoomTypes(token) {
  const response = await fetch('http://localhost:3001/api/v1/rooms/types', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  }); 
  if (!response.ok) {
    throw new Error('Error al obtener los tipos de habitación');
  }
  return response.json();
}

export async function updateRoomStatus(roomId, newStatus, token) {
  const response = await fetch(`http://localhost:3001/api/v1/rooms/${roomId}/status`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: newStatus }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al actualizar el estado de la habitación');
  }

  return response.json();
}