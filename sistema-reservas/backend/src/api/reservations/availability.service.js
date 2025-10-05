const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { getActiveSeason } = require('./pricing.service');

/**
 * Buscar habitaciones disponibles
 */
async function searchAvailableRooms(checkInDate, checkOutDate, guests, filters = {}) {
  const { roomTypeId, floor } = filters;

  // Convertir fechas a objetos Date
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  // Validar fechas
  if (checkIn >= checkOut) {
    throw new Error('La fecha de check-in debe ser anterior a la fecha de check-out');
  }

  // Normalizar a inicio del día para comparar solo fechas
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkInNormalized = new Date(checkIn);
  checkInNormalized.setHours(0, 0, 0, 0);

  if (checkInNormalized < today) {
    throw new Error('La fecha de check-in no puede ser en el pasado');
  }

  // Obtener todas las habitaciones según filtros
  const whereClause = {
    is_active: true,
    ...(roomTypeId && { room_type_id: roomTypeId }),
    ...(floor && { floor }),
  };

  const allRooms = await prisma.rooms.findMany({
    where: whereClause,
    include: {
      room_types: true,
    },
    orderBy: [
      { floor: 'asc' },
      { room_number: 'asc' },
    ],
  });

  // Buscar reservas que ocupan habitaciones en el rango de fechas
  const occupiedReservations = await prisma.reservation_rooms.findMany({
    where: {
      OR: [
        {
          AND: [
            { start_date: { lte: checkOut } },
            { end_date: { gte: checkIn } },
          ],
        },
      ],
      reservations: {
        status: {
          in: ['pending', 'confirmed', 'in_progress'],
        },
      },
    },
    select: {
      room_id: true,
    },
  });

  const occupiedRoomIds = new Set(occupiedReservations.map(r => r.room_id));

  // Filtrar habitaciones disponibles
  const availableRooms = allRooms
    .filter(room => !occupiedRoomIds.has(room.id))
    .map(room => ({
      id: room.id,
      number: room.room_number,
      floor: room.floor,
      type: room.room_types.name,
      typeId: room.room_types.id,
      capacity: room.capacity,
      basePrice: room.base_price,
      description: room.description,
    }));

  // Obtener temporada activa
  const activeSeason = await getActiveSeason(checkIn);

  // Calcular precios con temporada
  const roomsWithPrices = availableRooms.map(room => {
    let pricePerNight = room.basePrice;
    
    if (activeSeason && activeSeason.price_modifier) {
      pricePerNight = room.basePrice + Number(activeSeason.price_modifier);
    }

    return {
      ...room,
      pricePerNight,
    };
  });

  // Generar sugerencias automáticas
  const suggestions = generateRoomSuggestions(roomsWithPrices, guests, checkIn, checkOut, activeSeason);

  return {
    availableRooms: roomsWithPrices,
    activeSeason: activeSeason ? {
      name: activeSeason.name,
      modifier: Number(activeSeason.price_modifier),
    } : null,
    suggestions,
  };
}

/**
 * Generar sugerencias de combinaciones de habitaciones
 */
function generateRoomSuggestions(rooms, guests, checkIn, checkOut, season) {
  const suggestions = [];
  const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

  // Sugerencia 1: Una sola habitación que cubra todos los huéspedes
  const singleRoomOption = rooms.find(room => room.capacity >= guests);
  if (singleRoomOption) {
    suggestions.push({
      id: 'single',
      name: `1 ${singleRoomOption.type}`,
      rooms: [singleRoomOption],
      totalCapacity: singleRoomOption.capacity,
      pricePerNight: singleRoomOption.pricePerNight,
      totalPrice: singleRoomOption.pricePerNight * nights,
    });
  }

  // Sugerencia 2: Múltiples habitaciones
  if (guests > 1) {
    const doubleRooms = rooms.filter(r => r.capacity === 2).slice(0, Math.ceil(guests / 2));
    
    if (doubleRooms.length > 0) {
      const totalCapacity = doubleRooms.reduce((sum, r) => sum + r.capacity, 0);
      
      if (totalCapacity >= guests) {
        const pricePerNight = doubleRooms.reduce((sum, r) => sum + r.pricePerNight, 0);
        
        suggestions.push({
          id: 'multiple',
          name: `${doubleRooms.length} Habitaciones Dobles`,
          rooms: doubleRooms,
          totalCapacity,
          pricePerNight,
          totalPrice: pricePerNight * nights,
        });
      }
    }
  }

  return suggestions;
}

module.exports = {
  searchAvailableRooms,
};