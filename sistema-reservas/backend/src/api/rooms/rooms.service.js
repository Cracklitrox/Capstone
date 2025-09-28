const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// La función getAllRooms no necesita cambios
async function getAllRooms() {
  const rooms = await prisma.rooms.findMany({
    orderBy: { id: 'asc' },
    include: {
      room_types: { select: { name: true } },
      reservation_rooms: {
        where: { reservations: { status: { in: ['confirmed', 'in_progress', 'pending'] } } },
        orderBy: { start_date: 'asc' },
        take: 1,
        include: {
          reservations: {
            include: {
              users_reservations_main_guest_idTousers: {
                select: { first_name: true, paternal_last_name: true }
              }
            },
          },
        },
      },
    },
  });

  return rooms.map(room => {
    const activeReservation = room.reservation_rooms?.[0]?.reservations;
    const guest = activeReservation?.users_reservations_main_guest_idTousers;

    return {
      id: room.id,
      number: room.room_number,
      type: room.room_types?.name || 'N/A',
      floor: room.floor,
      status: room.status,
      capacity: room.capacity,
      base_price: room.base_price,
      reservation: activeReservation ? {
        id: activeReservation.id,
        check_in_date: activeReservation.check_in_date,
        check_out_date: activeReservation.check_out_date,
        guest: guest ? {
          first_name: guest.first_name,
          paternal_last_name: guest.paternal_last_name,
        } : null,
      } : null,
    };
  });
}


async function getRoomById(roomId) {
  const id = Number(roomId);
  if (isNaN(id)) {
    throw new Error('El ID de la habitación debe ser un número válido.');
  }

  // --- PRIMERA CONSULTA: OBTENER DETALLES PRINCIPALES ---
  const room = await prisma.rooms.findUnique({
    where: { id: id },
    include: {
      room_types: true,
      cleaning_records: {
        orderBy: { record_date: 'desc' },
        take: 10,
        include: {
          users: {
            select: { first_name: true, paternal_last_name: true },
          },
        },
      },
      maintenance_tasks: {
        orderBy: { created_at: 'desc' },
        take: 10,
      },
      reservation_rooms: {
        where: {
          reservations: {
            status: { in: ['in_progress', 'pending', 'confirmed'] }
          }
        },
        take: 1,
        include: {
          reservations: {
            include: {
              users_reservations_main_guest_idTousers: {
                include: {
                  guest_details: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!room) {
    return null;
  }

  // --- SEGUNDA CONSULTA: OBTENER HISTORIAL DE RESERVAS PASADAS ---
  const pastReservations = await prisma.reservation_rooms.findMany({
    where: {
      room_id: id,
      reservations: {
        status: 'completed' // Solo reservas completadas
      }
    },
    orderBy: {
      reservations: {
        check_out_date: 'desc' // Las más recientes primero
      }
    },
    take: 5, // Limitar a las últimas 5 para no sobrecargar
    include: {
      reservations: {
        include: {
          users_reservations_main_guest_idTousers: {
            select: {
              first_name: true,
              paternal_last_name: true,
            }
          }
        }
      }
    }
  });


  // --- TRANSFORMAR Y UNIR TODOS LOS DATOS ---
  const activeReservationData = room.reservation_rooms?.[0]?.reservations;
  const mainGuestData = activeReservationData?.users_reservations_main_guest_idTousers;

  return {
    id: room.id,
    number: room.room_number,
    type: room.room_types.name,
    floor: room.floor,
    status: room.status,
    capacity: room.capacity,
    base_price: room.base_price,
    description: room.description,

    currentGuest: mainGuestData ? {
      fullName: `${mainGuestData.first_name} ${mainGuestData.paternal_last_name}`,
      rut: `${mainGuestData.rut}-${mainGuestData.rut_dv}`,
      email: mainGuestData.email,
      phone: mainGuestData.phone_number,
      special_requests: mainGuestData.guest_details?.special_requests,
      observations: mainGuestData.guest_details?.observations,
    } : null,

    cleaningHistory: room.cleaning_records.map(record => ({
      id: record.id,
      date: record.record_date,
      observations: record.observations,
      receptionist: `${record.users.first_name} ${record.users.paternal_last_name}`,
    })),

    maintenanceHistory: room.maintenance_tasks,

    reservationHistory: pastReservations.map(rr => ({
      reservationId: rr.reservations.id,
      guestName: `${rr.reservations.users_reservations_main_guest_idTousers.first_name} ${rr.reservations.users_reservations_main_guest_idTousers.paternal_last_name}`,
      checkIn: rr.reservations.check_in_date,
      checkOut: rr.reservations.check_out_date
    }))
  };
}

// ... (El resto de las funciones no necesitan cambios)
async function getAllRoomTypes() {
  return prisma.room_types.findMany({
    where: { is_active: true },
    orderBy: { name: 'asc' },
  });
}

async function updateRoomStatus(roomId, newStatus) {
  const id = Number(roomId);
  if (isNaN(id)) {
    throw new Error('El ID de la habitación debe ser un número válido.');
  }
  
  return prisma.rooms.update({
    where: { id },
    data: { status: newStatus },
  });
}

module.exports = {
  getAllRooms,
  getRoomById,
  getAllRoomTypes,
  updateRoomStatus,
};