import prisma from '../../db/prisma.client.js';
import pricingService from './pricing.service.js';

const { calculateReservationTotal } = pricingService;

/**
 * Generar código único de reserva
 */
function generateReservationCode() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `RES-${year}-${random}`;
}

/**
 * Crear log de actividad
 */
async function createActivityLog(userId, userRole, actionType, affectedTable, recordId, details = null) {
  try {
    await prisma.activity_logs.create({
      data: {
        user_id: userId,
        user_role: userRole,
        action: actionType,
        affected_table: affectedTable,
        record_id: recordId,
        details: details ? JSON.stringify(details) : null,
      },
    });
  } catch (error) {
  }
}

/**
 * Crear reserva completa
 */
async function createReservation(reservationData, receptionistId, receptionistRole) {
  const {
    mainGuestId,
    additionalGuestIds = [],
    roomIds,
    services = [],
    checkInDate,
    checkOutDate,
    guestCount,
    channel = 'reception',
    paymentMethod,
    paymentAmount,
    isDeposit,
    multiplePayments = [], // NUEVO
    roomGuestAssignments = [], // NUEVO: [{ roomId, guestIds: [] }]
    roomServiceAssignments = [], // NUEVO: [{ roomId, serviceId, dates: [], quantity }]
  } = reservationData;

  // Validar fechas
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  if (checkIn >= checkOut) {
    throw new Error('La fecha de check-in debe ser anterior a la fecha de check-out');
  }

  // Calcular total de la reserva
  const pricing = await calculateReservationTotal(
    roomIds,
    services,
    checkInDate,
    checkOutDate,
    guestCount
  );

  // Validar capacidad
  const roomsCapacity = await prisma.rooms.findMany({
    where: { id: { in: roomIds } },
    select: { capacity: true },
  });

  const totalCapacity = roomsCapacity.reduce((sum, r) => sum + r.capacity, 0);

  if (totalCapacity < guestCount) {
    throw new Error(`La capacidad total (${totalCapacity}) es menor que el número de huéspedes (${guestCount})`);
  }

  // Generar código único
  let code = generateReservationCode();
  let codeExists = await prisma.reservations.findUnique({ where: { code } });

  while (codeExists) {
    code = generateReservationCode();
    codeExists = await prisma.reservations.findUnique({ where: { code } });
  }

  // Determinar estado inicial según método de pago
  let initialStatus = 'pending'; // Default
  let hasTransfer = false;

  if (paymentMethod === 'multiple' && multiplePayments.length > 0) {
    // Si hay algún pago por transferencia, queda pending
    hasTransfer = multiplePayments.some(p => p.method === 'bank_transfer');
    initialStatus = hasTransfer ? 'pending' : 'confirmed';
  } else if (paymentMethod === 'cash') {
    initialStatus = 'confirmed';
  } else if (paymentMethod === 'bank_transfer') {
    initialStatus = 'pending';
  }

  // Crear reserva con transacción
  const reservation = await prisma.$transaction(async (tx) => {
    // 1. Crear reserva (paid_amount se calculará después de crear pagos)
    const newReservation = await tx.reservations.create({
      data: {
        code,
        main_guest_id: mainGuestId,
        receptionist_id: receptionistId,
        channel,
        status: initialStatus,
        check_in_date: checkIn,
        check_out_date: checkOut,
        guest_count: guestCount,
        total_amount: pricing.total,
        paid_amount: 0, // Temporal, se actualiza después
        booking_type: 'individual',
      },
    });

    // 2. Crear reservation_guests (huéspedes adicionales)
    if (additionalGuestIds.length > 0) {
      await tx.reservation_guests.createMany({
        data: additionalGuestIds.map(guestId => ({
          reservation_id: newReservation.id,
          guest_id: guestId,
        })),
      });
    }

    // 3. Crear reservation_rooms
    const roomsData = pricing.roomsBreakdown.map((roomBreakdown, index) => ({
      reservation_id: newReservation.id,
      room_id: roomIds[index],
      start_date: checkIn,
      end_date: checkOut,
      unit_price: roomBreakdown.pricePerNight,
      subtotal: roomBreakdown.subtotal,
    }));

    await tx.reservation_rooms.createMany({ data: roomsData });

    // 4. Actualizar estado de habitaciones
    await tx.rooms.updateMany({
      where: { id: { in: roomIds } },
      data: { status: 'pending' },
    });

    // 5. Crear reservation_services
    if (services.length > 0) {
      const servicesData = pricing.servicesBreakdown.map((serviceBreakdown) => ({
        reservation_id: newReservation.id,
        service_id: serviceBreakdown.serviceId,
        quantity: serviceBreakdown.quantity,
        unit_price: serviceBreakdown.unitPrice,
        subtotal: serviceBreakdown.subtotal,
      }));

      await tx.reservation_services.createMany({ data: servicesData });
    }

    // 6. Crear registro(s) de pago
    if (paymentAmount > 0) {
      if (paymentMethod === 'multiple' && multiplePayments.length > 0) {
        // Pagos múltiples
        const paymentsData = multiplePayments.map((payment, index) => ({
          reservation_id: newReservation.id,
          payment_method: payment.method,
          payment_type: payment.paymentType || 'full',
          status: payment.method === 'cash' ? 'confirmed' : 'pending',
          amount: payment.amount,
          is_deposit: paymentAmount < pricing.total,
          payment_sequence: index + 1,
        }));

        await tx.payments.createMany({ data: paymentsData });
      } else {
        // Pago simple
        await tx.payments.create({
          data: {
            reservation_id: newReservation.id,
            payment_method: paymentMethod,
            payment_type: reservationData.paymentType || 'full',
            status: paymentMethod === 'cash' ? 'confirmed' : 'pending',
            amount: paymentAmount,
            is_deposit: isDeposit || (paymentAmount < pricing.total),
          },
        });
      }
    }

    // 6b. Calcular paid_amount inicial (solo pagos confirmados = cash)
    let initialPaidAmount = 0;

    if (paymentMethod === 'multiple' && multiplePayments.length > 0) {
      // Sumar solo pagos en efectivo (confirmed)
      initialPaidAmount = multiplePayments
        .filter(p => p.method === 'cash')
        .reduce((sum, p) => sum + p.amount, 0);
    } else if (paymentMethod === 'cash') {
      // Pago simple en efectivo
      initialPaidAmount = paymentAmount;
    }
    // Si es bank_transfer, initialPaidAmount queda en 0

    // Actualizar paid_amount en la reserva
    await tx.reservations.update({
      where: { id: newReservation.id },
      data: { paid_amount: initialPaidAmount }
    });

    // Actualizar el objeto local para que tenga el paid_amount correcto
    newReservation.paid_amount = initialPaidAmount;

    // 7. Crear room_guest_assignments si se proporcionaron
    if (roomGuestAssignments.length > 0) {
      // Primero obtener los reservation_room_ids
      const reservationRooms = await tx.reservation_rooms.findMany({
        where: { reservation_id: newReservation.id },
        select: { id: true, room_id: true },
      });

      // Crear un mapa roomId -> reservation_room_id
      const roomIdToReservationRoomId = {};
      reservationRooms.forEach(rr => {
        roomIdToReservationRoomId[rr.room_id] = rr.id;
      });

      // Preparar datos para room_guest_assignments
      const guestAssignmentsData = [];
      roomGuestAssignments.forEach(assignment => {
        const reservationRoomId = roomIdToReservationRoomId[assignment.roomId];
        if (reservationRoomId) {
          assignment.guestIds.forEach(guestId => {
            guestAssignmentsData.push({
              reservation_room_id: reservationRoomId,
              guest_id: guestId,
            });
          });
        }
      });

      if (guestAssignmentsData.length > 0) {
        await tx.room_guest_assignments.createMany({
          data: guestAssignmentsData,
        });
      }
    }

    // 8. Crear room_service_daily si se proporcionaron
    if (roomServiceAssignments.length > 0) {
      // Obtener los reservation_room_ids
      const reservationRooms = await tx.reservation_rooms.findMany({
        where: { reservation_id: newReservation.id },
        select: { id: true, room_id: true },
      });

      // Crear un mapa roomId -> reservation_room_id
      const roomIdToReservationRoomId = {};
      reservationRooms.forEach(rr => {
        roomIdToReservationRoomId[rr.room_id] = rr.id;
      });

      // Preparar datos para room_service_daily
      const serviceAssignmentsData = [];
      roomServiceAssignments.forEach(assignment => {
        const reservationRoomId = roomIdToReservationRoomId[assignment.roomId];
        if (reservationRoomId) {
          assignment.dates.forEach(date => {
            serviceAssignmentsData.push({
              reservation_room_id: reservationRoomId,
              service_id: assignment.serviceId,
              service_date: new Date(date),
              unit_price: assignment.unitPrice,
              quantity: assignment.quantity,
              subtotal: assignment.unitPrice * assignment.quantity,
            });
          });
        }
      });

      if (serviceAssignmentsData.length > 0) {
        await tx.room_service_daily.createMany({
          data: serviceAssignmentsData,
        });
      }
    }

    return newReservation;
  });

  // 9. Crear log de actividad
  await createActivityLog(
    receptionistId,
    receptionistRole,
    'CREATE_RESERVATION',
    'reservations',
    reservation.id,
    {
      code: reservation.code,
      total_amount: pricing.total,
      rooms: roomIds.length,
      guests: guestCount,
    }
  );

  return {
    reservation,
    pricing,
  };
}

export default {
  createReservation,
};