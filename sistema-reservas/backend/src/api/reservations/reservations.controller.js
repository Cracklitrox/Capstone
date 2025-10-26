const reservationsService = require("./reservations.service");
const availabilityService = require("./availability.service");
const pricingService = require("./pricing.service");
const statusService = require("./status.service");
const { logError } = require("../../utils/errorLogger");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Buscar disponibilidad de habitaciones
 */
async function searchAvailability(req, res) {
  try {
    const { checkInDate, checkOutDate, guests, roomTypeId, floor } = req.query;

    if (!checkInDate || !checkOutDate || !guests) {
      return res.status(400).json({
        message:
          "Fechas de check-in, check-out y número de huéspedes son requeridos",
      });
    }

    const guestCount = parseInt(guests);
    if (isNaN(guestCount) || guestCount < 1) {
      return res.status(400).json({
        message: "El número de huéspedes debe ser válido",
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
    console.error("Error al buscar disponibilidad:", error);

    // NUEVO: Log de error
    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
      description: `Error al buscar disponibilidad: ${error.message}`,
      originModule: "reservations.controller - searchAvailability",
      severity: "medium",
      errorObject: error,
    });

    return res.status(500).json({
      message: "Error al buscar disponibilidad",
      error: error.message,
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
        message: "Debe seleccionar al menos una habitación",
      });
    }

    if (!checkInDate || !checkOutDate || !guests) {
      return res.status(400).json({
        message: "Fechas y número de huéspedes son requeridos",
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
    console.error("Error al calcular precio:", error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
      description: `Error al calcular precio: ${error.message}`,
      originModule: "reservations.controller - calculatePrice",
      severity: "medium",
      errorObject: error,
    });

    return res.status(500).json({
      message: "Error al calcular precio",
      error: error.message,
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
    const receptionistRole =
      req.user.user_roles[0]?.roles.name || "receptionist";

    // Validaciones
    if (!reservationData.mainGuestId) {
      return res.status(400).json({
        message: "Debe especificar el huésped principal",
      });
    }

    if (!reservationData.roomIds || reservationData.roomIds.length === 0) {
      return res.status(400).json({
        message: "Debe seleccionar al menos una habitación",
      });
    }

    if (!reservationData.checkInDate || !reservationData.checkOutDate) {
      return res.status(400).json({
        message: "Fechas de check-in y check-out son requeridas",
      });
    }

    if (!reservationData.guestCount || reservationData.guestCount < 1) {
      return res.status(400).json({
        message: "Número de huéspedes inválido",
      });
    }

    if (!reservationData.paymentMethod) {
      return res.status(400).json({
        message: "Método de pago es requerido",
      });
    }

    // Validar paymentType
    if (!reservationData.paymentType) {
      return res.status(400).json({
        message: "Tipo de pago es requerido (full, half_upfront, daily)",
      });
    }

    const validPaymentTypes = ['full', 'half_upfront', 'daily'];
    if (!validPaymentTypes.includes(reservationData.paymentType)) {
      return res.status(400).json({
        message: "Tipo de pago inválido. Debe ser: full, half_upfront o daily",
      });
    }

    // VALIDACIÓN ESPECIAL: Reservas de 1 día deben ser pago completo
    const checkIn = new Date(reservationData.checkInDate);
    const checkOut = new Date(reservationData.checkOutDate);
    const diffTime = Math.abs(checkOut - checkIn);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1 && reservationData.paymentType !== 'full') {
      return res.status(400).json({
        message: "Las reservas de 1 día deben pagarse completas (paymentType: 'full')",
      });
    }

    const result = await reservationsService.createReservation(
      reservationData,
      receptionistId,
      receptionistRole
    );

    return res.status(201).json({
      message: "Reserva creada exitosamente",
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
    console.error("Error al crear reserva:", error);

    // NUEVO: Log de error con severidad alta
    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
      description: `Error al crear reserva: ${error.message}`,
      originModule: "reservations.controller - createReservation",
      severity: "high", // Alta porque es creación de reserva
      errorObject: error,
    });

    if (error.message.includes("capacidad")) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Error al crear reserva",
      error: error.message,
    });
  }
}

/**
 * Obtener servicios disponibles
 */
async function getAvailableServices(req, res) {
  try {
    const services = await prisma.services.findMany({
      where: { is_active: true },
      orderBy: { name: "asc" },
    });

    return res.status(200).json(services);
  } catch (error) {
    console.error("Error al obtener servicios:", error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
      description: `Error al obtener servicios: ${error.message}`,
      originModule: "reservations.controller - getAvailableServices",
      severity: "low",
      errorObject: error,
    });

    return res.status(500).json({
      message: "Error al obtener servicios",
      error: error.message,
    });
  }
}

/**
 * NUEVO: Obtener menú de desayunos desde BD
 */
async function getBreakfastMenu(req, res) {
  try {
    const menuItems = await prisma.breakfast_menu_items.findMany({
      where: { is_active: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    // Agrupar por categoría
    const groupedMenu = menuItems.reduce((acc, item) => {
      const category = item.category || "Otros";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        id: item.id,
        name: item.name,
        description: item.description,
      });
      return acc;
    }, {});

    return res.status(200).json(groupedMenu);
  } catch (error) {
    console.error("Error al obtener menú de desayunos:", error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
      description: `Error al obtener menú de desayunos: ${error.message}`,
      originModule: "reservations.controller - getBreakfastMenu",
      severity: "low",
      errorObject: error,
    });

    return res.status(500).json({
      message: "Error al obtener menú de desayunos",
      error: error.message,
    });
  }
}

/**
 * Cambiar estado de una reserva
 */
async function changeStatus(req, res) {
  try {
    const { id } = req.params;
    const { newStatus, reason, metadata } = req.body;
    const userId = req.user.id;
    const userRole = req.user.user_roles[0]?.roles.name || 'guest';

    if (!newStatus) {
      return res.status(400).json({
        message: 'El nuevo estado es requerido'
      });
    }

    const result = await statusService.changeReservationStatus({
      reservationId: parseInt(id),
      newStatus,
      userId,
      userRole,
      reason,
      metadata
    });

    return res.status(200).json({
      message: result.message,
      reservation: {
        id: result.reservation.id,
        code: result.reservation.code,
        previousStatus: result.previousStatus,
        currentStatus: result.newStatus
      }
    });

  } catch (error) {
    console.error('Error al cambiar estado:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
      description: `Error al cambiar estado de reserva: ${error.message}`,
      originModule: 'reservations.controller - changeStatus',
      severity: 'high',
      errorObject: error
    });

    return res.status(400).json({
      message: error.message || 'Error al cambiar estado de reserva'
    });
  }
}

/**
 * Realizar check-in
 */
async function checkIn(req, res) {
  try {
    const { id } = req.params;
    const { reason, metadata } = req.body;
    const userId = req.user.id;
    const userRole = req.user.user_roles[0]?.roles.name || 'receptionist';

    const result = await statusService.changeReservationStatus({
      reservationId: parseInt(id),
      newStatus: 'in_progress',
      userId,
      userRole,
      reason: reason || 'Check-in realizado',
      metadata
    });

    return res.status(200).json({
      message: 'Check-in realizado exitosamente',
      reservation: {
        id: result.reservation.id,
        code: result.reservation.code,
        status: result.newStatus,
        roomsOccupied: result.roomsOccupied
      }
    });

  } catch (error) {
    console.error('Error en check-in:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
      description: `Error en check-in: ${error.message}`,
      originModule: 'reservations.controller - checkIn',
      severity: 'high',
      errorObject: error
    });

    return res.status(400).json({
      message: error.message || 'Error al realizar check-in'
    });
  }
}

/**
 * Realizar check-out
 */
async function checkOut(req, res) {
  try {
    const { id } = req.params;
    const { reason, metadata } = req.body;
    const userId = req.user.id;
    const userRole = req.user.user_roles[0]?.roles.name || 'receptionist';

    const result = await statusService.changeReservationStatus({
      reservationId: parseInt(id),
      newStatus: 'completed',
      userId,
      userRole,
      reason: reason || 'Check-out realizado',
      metadata
    });

    return res.status(200).json({
      message: 'Check-out realizado exitosamente',
      reservation: {
        id: result.reservation.id,
        code: result.reservation.code,
        status: result.newStatus,
        cleaningRecordsCreated: result.cleaningRecordsCreated
      }
    });

  } catch (error) {
    console.error('Error en check-out:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
      description: `Error en check-out: ${error.message}`,
      originModule: 'reservations.controller - checkOut',
      severity: 'high',
      errorObject: error
    });

    return res.status(400).json({
      message: error.message || 'Error al realizar check-out'
    });
  }
}

/**
 * Obtener historial de cambios de una reserva
 */
async function getHistory(req, res) {
  try {
    const { id } = req.params;

    const history = await statusService.getReservationHistory(parseInt(id));

    return res.status(200).json({
      reservationId: parseInt(id),
      history: history.map(h => ({
        id: h.id,
        changeType: h.change_type,
        fieldChanged: h.field_changed,
        oldValue: h.old_value,
        newValue: h.new_value,
        changedBy: h.changed_by_user ? {
          id: h.changed_by_user.id,
          name: `${h.changed_by_user.first_name} ${h.changed_by_user.paternal_last_name}`
        } : null,
        reason: h.change_reason,
        metadata: h.metadata,
        createdAt: h.created_at
      }))
    });

  } catch (error) {
    console.error('Error al obtener historial:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
      description: `Error al obtener historial: ${error.message}`,
      originModule: 'reservations.controller - getHistory',
      severity: 'medium',
      errorObject: error
    });

    return res.status(500).json({
      message: 'Error al obtener historial de reserva'
    });
  }
}

/**
 * Obtener transiciones válidas para una reserva
 */
async function getValidTransitions(req, res) {
  try {
    const { id } = req.params;

    const reservation = await prisma.reservations.findUnique({
      where: { id: parseInt(id) },
      select: { status: true }
    });

    if (!reservation) {
      return res.status(404).json({
        message: 'Reserva no encontrada'
      });
    }

    const validTransitions = statusService.getValidTransitions(reservation.status);

    return res.status(200).json({
      currentStatus: reservation.status,
      validTransitions
    });

  } catch (error) {
    console.error('Error al obtener transiciones válidas:', error);

    return res.status(500).json({
      message: 'Error al obtener transiciones válidas'
    });
  }
}

module.exports = {
  searchAvailability,
  calculatePrice,
  createReservation,
  getAvailableServices,
  getBreakfastMenu,
  // Nuevos endpoints de estado
  changeStatus,
  checkIn,
  checkOut,
  getHistory,
  getValidTransitions
};
