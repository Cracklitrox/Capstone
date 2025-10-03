const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { calculateReservationTotal } = require('./pricing.service');

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
    console.error('Error al crear log de actividad:', error);
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

  // Determinar estado inicial
  let initialStatus = 'pending';
  
  if (paymentMethod === 'cash' && paymentAmount >= pricing.total) {
    initialStatus = 'confirmed';
  }

  // Crear reserva con transacción
  const reservation = await prisma.$transaction(async (tx) => {
    // 1. Crear reserva
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
        paid_amount: paymentMethod === 'cash' && initialStatus === 'confirmed' ? paymentAmount : 0,
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

    // 6. Crear registro de pago
    if (paymentAmount > 0) {
      await tx.payments.create({
        data: {
          reservation_id: newReservation.id,
          payment_method: paymentMethod,
          status: paymentMethod === 'cash' ? 'confirmed' : 'pending',
          amount: paymentAmount,
          is_deposit: isDeposit || (paymentAmount < pricing.total),
        },
      });
    }

    return newReservation;
  });

  // 7. Crear log de actividad
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

module.exports = {
  createReservation,
};