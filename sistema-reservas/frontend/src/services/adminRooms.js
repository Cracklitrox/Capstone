// Servicios para consumir los endpoints de administración de habitaciones y tipos de habitaciones

// Funciones de lectura - usando rutas públicas (solo requieren autenticación)
export async function fetchAdminRooms(token) {
  const response = await fetch('http://localhost:3001/api/v1/rooms', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Error al obtener habitaciones');
  return response.json();
}

export async function fetchAdminRoomTypes(token) {
  const response = await fetch('http://localhost:3001/api/v1/rooms/types', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Error al obtener tipos de habitación');
  return response.json();
}

export async function createAdminRoom(data, token) {
  const response = await fetch('http://localhost:3001/api/v1/admin/rooms', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al crear habitación');
  return response.json();
}

export async function createAdminRoomType(data, token) {
  const response = await fetch('http://localhost:3001/api/v1/admin/rooms/room-types', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al crear tipo de habitación');
  return response.json();
}

export async function updateAdminRoom(id, data, token) {
  const response = await fetch(`http://localhost:3001/api/v1/admin/rooms/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al modificar habitación');
  return response.json();
}

export async function updateAdminRoomType(id, data, token) {
  const response = await fetch(`http://localhost:3001/api/v1/admin/rooms/room-types/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al modificar tipo de habitación');
  return response.json();
}

export async function deleteAdminRoom(id, token) {
  const response = await fetch(`http://localhost:3001/api/v1/admin/rooms/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Error al eliminar habitación');
  return true;
}

export async function deleteAdminRoomType(id, token) {
  const response = await fetch(`http://localhost:3001/api/v1/admin/rooms/room-types/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error('Error al eliminar tipo de habitación');
  return true;
}
