const reservationsService = require('./reservations.service');
const availabilityService = require('./availability.service');
const pricingService = require('./pricing.service');

/**
 * Buscar disponibilidad de habitaciones
 */
async function searchAvailability(req, res) {
  try {
    const { checkInDate, checkOutDate, guests, roomTypeId, floor } = req.query;

    // Validaciones
    if (!checkInDate || !checkOutDate || !guests) {
      return res.status(400).json({ 
        message: 'Fechas de check-in, check-out y número de huéspedes son requeridos' 
      });
    }

    const guestCount = parseInt(guests);
    if (isNaN(guestCount) || guestCount < 1) {
      return res.status(400).json({ 
        message: 'El número de huéspedes debe ser válido' 
      });
    }

    const filters = {};
    if (roomTypeId) filters.roomTypeId = parseInt(roomTypeId);
    if (floor) filters.floor = parseInt(floor);

    const result = await availabilityService.searchAvailableRooms(
      checkInDate,
      checkOutDate,
      guestCount,
      filters
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error al buscar disponibilidad:', error);
    return res.status(500).json({ 
      message: 'Error al buscar disponibilidad',
      error: error.message 
    });
  }
}

/**
 * Calcular precio estimado de reserva
 */
async function calculatePrice(req, res) {
  try {
    const { roomIds, services, checkInDate, checkOutDate, guests } = req.body;

    if (!roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
      return res.status(400).json({ 
        message: 'Debe seleccionar al menos una habitación' 
      });
    }

    if (!checkInDate || !checkOutDate || !guests) {
      return res.status(400).json({ 
        message: 'Fechas y número de huéspedes son requeridos' 
      });
    }

    const pricing = await pricingService.calculateReservationTotal(
      roomIds,
      services || [],
      checkInDate,
      checkOutDate,
      guests
    );

    return res.status(200).json(pricing);
  } catch (error) {
    console.error('Error al calcular precio:', error);
    return res.status(500).json({ 
      message: 'Error al calcular precio',
      error: error.message 
    });
  }
}

/**
 * Crear nueva reserva
 */
async function createReservation(req, res) {
  try {
    const reservationData = req.body;
    const receptionistId = req.user.id;
    const receptionistRole = req.user.user_roles[0]?.roles.name || 'receptionist';

    // Validaciones
    if (!reservationData.mainGuestId) {
      return res.status(400).json({ 
        message: 'Debe especificar el huésped principal' 
      });
    }

    if (!reservationData.roomIds || reservationData.roomIds.length === 0) {
      return res.status(400).json({ 
        message: 'Debe seleccionar al menos una habitación' 
      });
    }

    if (!reservationData.checkInDate || !reservationData.checkOutDate) {
      return res.status(400).json({ 
        message: 'Fechas de check-in y check-out son requeridas' 
      });
    }

    if (!reservationData.guestCount || reservationData.guestCount < 1) {
      return res.status(400).json({ 
        message: 'Número de huéspedes inválido' 
      });
    }

    if (!reservationData.paymentMethod) {
      return res.status(400).json({ 
        message: 'Método de pago es requerido' 
      });
    }

    const result = await reservationsService.createReservation(
      reservationData,
      receptionistId,
      receptionistRole
    );

    return res.status(201).json({
      message: 'Reserva creada exitosamente',
      reservation: {
        id: result.reservation.id,
        code: result.reservation.code,
        status: result.reservation.status,
        checkInDate: result.reservation.check_in_date,
        checkOutDate: result.reservation.check_out_date,
        totalAmount: result.pricing.total,
        paidAmount: result.reservation.paid_amount,
      },
      pricing: result.pricing,
    });
  } catch (error) {
    console.error('Error al crear reserva:', error);
    
    if (error.message.includes('capacidad')) {
      return res.status(400).json({ 
        message: error.message 
      });
    }
    
    return res.status(500).json({ 
      message: 'Error al crear reserva',
      error: error.message 
    });
  }
}

/**
 * Obtener servicios disponibles
 */
async function getAvailableServices(req, res) {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const services = await prisma.services.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    });

    return res.status(200).json(services);
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    return res.status(500).json({ 
      message: 'Error al obtener servicios',
      error: error.message 
    });
  }
}

module.exports = {
  searchAvailability,
  calculatePrice,
  createReservation,
  getAvailableServices,
};