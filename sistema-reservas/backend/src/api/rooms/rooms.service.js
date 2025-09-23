const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Obtiene todas las habitaciones de la base de datos.
 * @returns {Promise<Array>} Lista de habitaciones
 */
async function getAllRooms() {
  // Incluye la reserva activa (más reciente) y datos del huésped principal solo para habitaciones ocupadas
  const rooms = await prisma.rooms.findMany({
    orderBy: { id: 'asc' },
    include: {
      room_types: { select: { name: true, description: true } },
      reservation_rooms: {
        include: {
          reservations: {
            include: {
              users_reservations_main_guest_idTousers: true,
            },
          },
        },
      },
    },
  });
  // Adaptar y limpiar los datos para el frontend
  return rooms.map(room => {
    // Estado traducido
    const statusMap = {
      available: 'Disponible',
      occupied: 'Ocupado',
      cleaning: 'Limpieza',
      maintenance: 'Mantenimiento',
      reserved: 'Reservado',
      pendiente: 'Pendiente',
    };
    const s = String(room.status || '').toLowerCase();
    let reservation = null;
    if ((s === 'occupied' || s === 'ocupado') && Array.isArray(room.reservation_rooms) && room.reservation_rooms.length > 0) {
      const sorted = [...room.reservation_rooms].sort((a, b) => {
        const dateA = a?.reservations?.check_in_date ? new Date(a.reservations.check_in_date) : null;
        const dateB = b?.reservations?.check_in_date ? new Date(b.reservations.check_in_date) : null;
        if (dateA && dateB) return dateB - dateA;
        if (dateA) return -1;
        if (dateB) return 1;
        return (b?.id || 0) - (a?.id || 0);
      });
      const res = sorted[0]?.reservations;
      if (res) {
        reservation = {
          code: res.code,
          check_in_date: res.check_in_date,
          check_out_date: res.check_out_date,
          guest: res.users_reservations_main_guest_idTousers ? {
            first_name: res.users_reservations_main_guest_idTousers.first_name,
            paternal_last_name: res.users_reservations_main_guest_idTousers.paternal_last_name,
          } : null,
        };
      }
    }
    return {
      id: room.id,
      number: room.room_number,
      type: room.room_types?.name || room.room_type_id,
      type_description: room.room_types?.description,
      floor: room.floor,
      status: s,
      status_label: statusMap[s] || room.status,
      capacity: room.capacity,
      base_price: room.base_price,
      description: room.description,
      reservation, // null o datos de la reserva activa
    };
  });
}

module.exports = {
  getAllRooms,
  /**
   * Obtiene los detalles de una habitación por su ID.
   * @param {number} id
   * @returns {Promise<Object|null>} Detalles de la habitación
   */
  async getRoomById(roomId) {
    const room = await prisma.rooms.findUnique({
      where: { id: Number(roomId) },
      include: {
        room_types: true,
        reservation_rooms: {
          include: {
            reservations: {
              include: {
                users_reservations_main_guest_idTousers: true,
                payments: true,
              },
            },
          },
        },
      },
    });
    if (!room) return null;
    // Si hay reservas, dejar solo la más reciente por check_in_date
    if (Array.isArray(room.reservation_rooms) && room.reservation_rooms.length > 0) {
      const sorted = [...room.reservation_rooms].sort((a, b) => {
        const dateA = a?.reservations?.check_in_date ? new Date(a.reservations.check_in_date) : null;
        const dateB = b?.reservations?.check_in_date ? new Date(b.reservations.check_in_date) : null;
        if (dateA && dateB) return dateB - dateA;
        if (dateA) return -1;
        if (dateB) return 1;
        return (b?.id || 0) - (a?.id || 0);
      });
      room.reservation_rooms = [sorted[0]];
    }
    return room;
  }
};
