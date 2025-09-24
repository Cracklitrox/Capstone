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
      cleaning_records: {
        include: {
          users: true,
        },
      },
      maintenance_tasks: true,
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
    // Si la habitación está ocupada, pendiente o reservada, mostrar la reserva más reciente
    if ((s === 'occupied' || s === 'ocupado' || s === 'pendiente' || s === 'pending' || s === 'reserved' || s === 'reservado')
      && Array.isArray(room.reservation_rooms) && room.reservation_rooms.length > 0) {
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
    // Si está en limpieza, tomar el último registro de cleaning_records
    let cleaning = null;
    if ((s === 'cleaning' || s === 'limpieza') && Array.isArray(room.cleaning_records) && room.cleaning_records.length > 0) {
      // Ordenar por fecha de inicio descendente
      const sorted = [...room.cleaning_records].sort((a, b) => new Date(b.record_date) - new Date(a.record_date));
      const record = sorted[0];
      if (record) {
        cleaning = {
          id: record.id,
          start_time: record.record_date,
          end_time: record.completed_at,
          status: record.is_completed ? 'Completada' : 'En proceso',
          user: record.users ? {
            id: record.users.id,
            name: record.users.name,
          } : null,
          notes: record.observations,
        };
      }
    }
    // Si está en mantenimiento, tomar el último registro de maintenance_tasks
    let maintenance = null;
    if ((s === 'maintenance' || s === 'mantenimiento') && Array.isArray(room.maintenance_tasks) && room.maintenance_tasks.length > 0) {
      // Ordenar por fecha de inicio descendente
      const sorted = [...room.maintenance_tasks].sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
      const record = sorted[0];
      if (record) {
        maintenance = {
          id: record.id,
          category: record.category,
          description: record.description,
          start_date: record.start_date,
          end_date: record.end_date,
          priority: record.priority,
          status: record.status,
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
      cleaning, // null o datos del registro de limpieza activo
      maintenance, // null o datos del registro de mantenimiento activo
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
        cleaning_records: {
          include: {
            users: true,
          },
        },
        maintenance_tasks: true,
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
    // Adaptar datos de limpieza igual que en getAllRooms
    let cleaning = null;
    let maintenance = null;
    const s = String(room.status || '').toLowerCase();
    if ((s === 'cleaning' || s === 'limpieza') && Array.isArray(room.cleaning_records) && room.cleaning_records.length > 0) {
      const sorted = [...room.cleaning_records].sort((a, b) => new Date(b.record_date) - new Date(a.record_date));
      const record = sorted[0];
      if (record) {
        cleaning = {
          id: record.id,
          start_time: record.record_date,
          end_time: record.completed_at,
          status: record.is_completed ? 'Completada' : 'En proceso',
          user: record.users ? {
            id: record.users.id,
            name: record.users.name,
          } : null,
          notes: record.observations,
        };
      }
    }
    // Adaptar datos de mantenimiento igual que en getAllRooms
    if ((s === 'maintenance' || s === 'mantenimiento') && Array.isArray(room.maintenance_tasks) && room.maintenance_tasks.length > 0) {
      const sorted = [...room.maintenance_tasks].sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
      const record = sorted[0];
      if (record) {
        maintenance = {
          id: record.id,
          category: record.category,
          description: record.description,
          start_date: record.start_date,
          end_date: record.end_date,
          priority: record.priority,
          status: record.status,
        };
      }
    }
    // Retornar el objeto adaptado para el frontend
    return {
      ...room,
      cleaning,
      maintenance,
    };
  }
};
