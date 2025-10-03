const reservationsService = require("./reservations.service");
const availabilityService = require("./availability.service");
const pricingService = require("./pricing.service");
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

module.exports = {
  searchAvailability,
  calculatePrice,
  createReservation,
  getAvailableServices,
  getBreakfastMenu, // NUEVO
};
