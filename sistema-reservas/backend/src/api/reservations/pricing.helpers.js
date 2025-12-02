import prisma from '../../db/prisma.client.js';
import pricingService from './pricing.service.js';
const { calculateRoomPrice, calculateNights } = pricingService;

/**
 * Calcular precio del primer día de una reserva
 * Esto se usa para validaciones de pago mínimo
 */
async function calculateFirstDayPrice(reservationId) {
  const reservation = await prisma.reservations.findUnique({
    where: { id: reservationId },
    include: {
      reservation_rooms: {
        where: { deleted_at: null },
        include: { rooms: true }
      },
      reservation_services: {
        where: { deleted_at: null },
        include: { services: true }
      }
    }
  });

  if (!reservation) {
    throw new Error('Reserva no encontrada');
  }

  const checkIn = reservation.check_in_date;
  const checkOut = reservation.check_out_date;

  // Calcular precio de 1 noche para todas las habitaciones
  let roomsFirstDayTotal = 0;

  for (const resRoom of reservation.reservation_rooms) {
    // Calcular precio de la habitación por noche
    const roomPricing = await calculateRoomPrice(
      resRoom.room_id,
      checkIn,
      checkOut
    );
    roomsFirstDayTotal += roomPricing.pricePerNight;
  }

  // Servicios que son "per_night" o "per_person" se calculan para 1 día
  let servicesFirstDayTotal = 0;

  for (const resService of reservation.reservation_services) {
    const service = resService.services;

    if (service.unit === 'per_night') {
      servicesFirstDayTotal += resService.unit_price;
    } else if (service.unit === 'per_person') {
      // unit_price ya debería tener el precio por persona calculado
      servicesFirstDayTotal += resService.unit_price;
    }
    // per_room, per_unit, custom no se incluyen en el primer día
  }

  const firstDayTotal = roomsFirstDayTotal + servicesFirstDayTotal;

  return {
    firstDayTotal,
    roomsFirstDayTotal,
    servicesFirstDayTotal,
    totalNights: calculateNights(checkIn, checkOut),
    totalAmount: reservation.total_amount
  };
}

/**
 * Calcular días consumidos en una reserva activa
 */
function calculateConsumedDays(checkInDate, currentDate) {
  const checkIn = new Date(checkInDate);
  const today = new Date(currentDate || new Date());

  const diffTime = Math.abs(today - checkIn);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Calcular días restantes en una reserva
 */
function calculateRemainingDays(currentDate, checkOutDate) {
  const today = new Date(currentDate || new Date());
  const checkOut = new Date(checkOutDate);

  const diffTime = Math.abs(checkOut - today);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Validar si una reserva requiere pago según su paymentType
 * @param {Object} reservation - Reserva con payments incluidos
 * @param {Date} currentDate - Fecha actual para cálculos
 * @returns {Object} - { isValid, requiredAmount, currentPaid, message }
 */
async function validatePaymentByType(reservation, currentDate = new Date()) {
  const payments = reservation.payments || [];
  const confirmedPayments = payments.filter(p => p.status === 'confirmed');
  const currentPaid = confirmedPayments.reduce((sum, p) => sum + p.amount, 0);

  // Obtener paymentType del primer pago (deberían ser todos iguales)
  const firstPayment = payments[0];
  const paymentType = firstPayment?.payment_type || 'full';

  const totalAmount = reservation.total_amount;
  const nights = calculateNights(reservation.check_in_date, reservation.check_out_date);
  const consumedDays = calculateConsumedDays(reservation.check_in_date, currentDate);

  let requiredAmount = 0;
  let message = '';

  switch (paymentType) {
    case 'full':
      requiredAmount = totalAmount;
      message = 'Pago completo requerido';
      break;

    case 'half_upfront':
      // Al inicio: 50%
      // A mitad de estadía: 100%
      const halfwayPoint = Math.ceil(nights / 2);

      if (consumedDays >= halfwayPoint) {
        requiredAmount = totalAmount; // 100%
        message = `Pago completo requerido (mitad de estadía alcanzada: día ${halfwayPoint}/${nights})`;
      } else {
        requiredAmount = Math.ceil(totalAmount * 0.5); // 50%
        message = `Pago del 50% requerido (mitad de estadía en día ${halfwayPoint})`;
      }
      break;

    case 'daily':
      // Debe haber pagado hasta el día actual
      const pricePerDay = Math.ceil(totalAmount / nights);
      requiredAmount = pricePerDay * (consumedDays + 1); // +1 para incluir día actual
      message = `Pago diario requerido hasta día ${consumedDays + 1}/${nights}`;
      break;

    default:
      requiredAmount = totalAmount;
      message = 'Tipo de pago desconocido, requiere pago completo';
  }

  const isValid = currentPaid >= requiredAmount;

  return {
    isValid,
    requiredAmount,
    currentPaid,
    pending: requiredAmount - currentPaid,
    paymentType,
    message,
    consumedDays,
    totalNights: nights
  };
}

export default {
  calculateFirstDayPrice,
  calculateConsumedDays,
  calculateRemainingDays,
  validatePaymentByType
};
