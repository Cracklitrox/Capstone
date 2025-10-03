const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Obtener temporada activa para una fecha
 */
async function getActiveSeason(date) {
  const targetDate = new Date(date);
  
  const season = await prisma.seasons.findFirst({
    where: {
      is_active: true,
      start_date: { lte: targetDate },
      end_date: { gte: targetDate },
    },
  });

  return season;
}

/**
 * Calcular precio de habitación con temporada
 */
async function calculateRoomPrice(roomId, checkInDate, checkOutDate) {
  const room = await prisma.rooms.findUnique({
    where: { id: roomId },
    select: { base_price: true, room_number: true },
  });

  if (!room) {
    throw new Error(`Habitación ${roomId} no encontrada`);
  }

  const season = await getActiveSeason(checkInDate);
  
  let pricePerNight = room.base_price;
  
  if (season && season.price_modifier) {
    // price_modifier es un valor absoluto que se suma al precio base
    pricePerNight = room.base_price + Number(season.price_modifier);
  }

  const nights = calculateNights(checkInDate, checkOutDate);
  const subtotal = pricePerNight * nights;

  return {
    roomNumber: room.room_number,
    basePrice: room.base_price,
    pricePerNight,
    nights,
    subtotal,
    seasonApplied: season ? season.name : null,
    seasonModifier: season ? Number(season.price_modifier) : 0,
  };
}

/**
 * Calcular precio de servicio
 */
async function calculateServicePrice(serviceId, quantity, nights, guests) {
  const service = await prisma.services.findUnique({
    where: { id: serviceId },
  });

  if (!service) {
    throw new Error(`Servicio ${serviceId} no encontrado`);
  }

  let subtotal = 0;
  
  switch (service.unit) {
    case 'per_night':
      subtotal = service.price * nights;
      break;
    case 'per_person':
      subtotal = service.price * guests * nights;
      break;
    case 'per_room':
      subtotal = service.price * quantity; // quantity = número de habitaciones
      break;
    case 'per_unit':
      subtotal = service.price * quantity; // quantity = cantidad especificada
      break;
    default:
      subtotal = service.price;
  }

  return {
    serviceId: service.id,
    serviceName: service.name,
    unit: service.unit,
    unitPrice: service.price,
    quantity,
    subtotal,
  };
}

/**
 * Calcular número de noches
 */
function calculateNights(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Calcular total de reserva
 */
async function calculateReservationTotal(roomIds, serviceData, checkInDate, checkOutDate, guests) {
  let roomsSubtotal = 0;
  const roomsBreakdown = [];

  // Calcular precio de habitaciones
  for (const roomId of roomIds) {
    const roomPrice = await calculateRoomPrice(roomId, checkInDate, checkOutDate);
    roomsSubtotal += roomPrice.subtotal;
    roomsBreakdown.push(roomPrice);
  }

  let servicesSubtotal = 0;
  const servicesBreakdown = [];

  // Calcular precio de servicios
  const nights = calculateNights(checkInDate, checkOutDate);
  
  for (const serviceItem of serviceData) {
    const servicePrice = await calculateServicePrice(
      serviceItem.serviceId,
      serviceItem.quantity,
      nights,
      guests
    );
    servicesSubtotal += servicePrice.subtotal;
    servicesBreakdown.push(servicePrice);
  }

  const total = roomsSubtotal + servicesSubtotal;

  return {
    nights,
    roomsBreakdown,
    roomsSubtotal,
    servicesBreakdown,
    servicesSubtotal,
    total,
  };
}

module.exports = {
  getActiveSeason,
  calculateRoomPrice,
  calculateServicePrice,
  calculateNights,
  calculateReservationTotal,
};