const {
  searchGuestByIdentification,
  createGuest: createGuestService,
  updateGuest: updateGuestService,
  searchAllGuestsService,
  getGuestProfileById,
  getGuestReservationsHistory,
  updateGuestObservationsService,
  updateGuestProfileService,
} = require("./guests.service");
const { logError } = require("../../utils/errorLogger");

/**
 * Buscar huésped por identificación
 */
async function searchGuest(req, res) {
  try {
    const { identificationNumber } = req.params;

    if (!identificationNumber || identificationNumber.trim() === "") {
      return res.status(400).json({
        message: "Número de identificación es requerido",
      });
    }

    const result = await searchGuestByIdentification(
      identificationNumber.trim()
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error al buscar huésped:", error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al buscar huésped: ${error.message}`,
      originModule: "guests.controller - searchGuest",
      severity: "medium",
      errorObject: error,
    });

    return res.status(500).json({
      message: "Error al buscar huésped",
      error: error.message,
    });
  }
}

/**
 * ✅ Crear nuevo huésped
 */
async function createGuest(req, res) {
  try {
    const guestData = req.body;
    const isMainGuest =
      req.body.isMainGuest !== undefined ? req.body.isMainGuest : true;

    // Validaciones mínimas (siempre obligatorias)
    if (
      !guestData.identificationNumber ||
      !guestData.firstName ||
      !guestData.paternalLastName
    ) {
      return res.status(400).json({
        message:
          "Datos incompletos. Identificación, nombre y apellido paterno son obligatorios.",
      });
    }

    // Validar email SOLO si es huésped principal Y si tiene email
    if (isMainGuest) {
      if (!guestData.email) {
        return res.status(400).json({
          message: "Email es obligatorio para el huésped principal",
        });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(guestData.email)) {
        return res.status(400).json({
          message: "Email inválido",
        });
      }
    } else {
      // Huésped adicional: validar email SOLO si lo proporcionó
      if (guestData.email && guestData.email.trim() !== "") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(guestData.email)) {
          return res.status(400).json({
            message: "Email inválido",
          });
        }
      }
    }

    // ✅ Intentar crear el huésped
    // El service ya maneja la verificación de duplicados y lanza error 409
    const newGuest = await createGuestService(guestData, isMainGuest);

    return res.status(201).json({
      message: "Huésped creado exitosamente",
      guest: newGuest,
    });
  } catch (error) {
    console.error("Error al crear huésped:", error);

    // ✅ Si es error 409 (duplicado), devolver con los datos del existente
    if (error.statusCode === 409) {
      return res.status(409).json({
        message: error.message,
        guest: error.existingGuest,
      });
    }

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al crear huésped: ${error.message}`,
      originModule: "guests.controller - createGuest",
      severity: "medium",
      errorObject: error,
    });

    return res.status(500).json({
      message: "Error al crear huésped",
      error: error.message,
    });
  }
}

/**
 * ✅ Actualizar huésped existente
 */
async function updateGuest(req, res) {
  try {
    const { id } = req.params;
    const guestData = req.body;
    const isMainGuest =
      req.body.isMainGuest !== undefined ? req.body.isMainGuest : true;

    // ✅ Usar la nueva función updateGuest del service
    const updatedGuest = await updateGuestService(
      parseInt(id),
      guestData,
      isMainGuest
    );

    return res.status(200).json({
      message: "Huésped actualizado exitosamente",
      guest: updatedGuest,
    });
  } catch (error) {
    console.error("Error al actualizar huésped:", error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al actualizar huésped: ${error.message}`,
      originModule: "guests.controller - updateGuest",
      severity: "low",
      errorObject: error,
    });

    return res.status(500).json({
      message: "Error al actualizar huésped",
      error: error.message,
    });
  }
}

/**
 * ✅ Obtener todos los huéspedes con búsqueda y paginación
 */
async function getAllGuests(req, res) {
  try {
    const { search = "", page = 1, limit = 20 } = req.query;

    const result = await searchAllGuestsService(search, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error al obtener huéspedes:", error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener huéspedes: ${error.message}`,
      originModule: "guests.controller - getAllGuests",
      severity: "medium",
      errorObject: error,
    });

    return res.status(500).json({
      message: "Error al obtener huéspedes",
      error: error.message,
    });
  }
}

/**
 * ✅ Obtener perfil completo de huésped
 */
async function getGuestProfile(req, res) {
  try {
    const { id } = req.params;

    const profile = await getGuestProfileById(parseInt(id));

    return res.status(200).json({
      found: true,
      profile,
    });
  } catch (error) {
    console.error("Error al obtener perfil de huésped:", error);

    if (error.message.includes("no encontrado")) {
      return res.status(404).json({
        found: false,
        message: error.message,
      });
    }

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener perfil de huésped: ${error.message}`,
      originModule: "guests.controller - getGuestProfile",
      severity: "medium",
      errorObject: error,
    });

    return res.status(500).json({
      message: "Error al obtener perfil de huésped",
      error: error.message,
    });
  }
}

/**
 * ✅ Obtener historial de reservas de huésped
 */
async function getGuestReservations(req, res) {
  try {
    const { id } = req.params;
    const { status, startDate, endDate, page = 1, limit = 10 } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const pagination = { page: parseInt(page), limit: parseInt(limit) };

    const result = await getGuestReservationsHistory(
      parseInt(id),
      filters,
      pagination
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error al obtener reservas de huésped:", error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener reservas de huésped: ${error.message}`,
      originModule: "guests.controller - getGuestReservations",
      severity: "low",
      errorObject: error,
    });

    return res.status(500).json({
      message: "Error al obtener reservas de huésped",
      error: error.message,
    });
  }
}

/**
 * ✅ Actualizar observaciones de huésped
 */
async function updateGuestObservations(req, res) {
  try {
    const { id } = req.params;
    const { observations } = req.body;

    const result = await updateGuestObservationsService(
      parseInt(id),
      observations
    );

    if (!result.found) {
      return res.status(404).json({
        found: false,
        message: "Huésped no encontrado",
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error al actualizar observaciones:", error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al actualizar observaciones: ${error.message}`,
      originModule: "guests.controller - updateGuestObservations",
      severity: "low",
      errorObject: error,
    });

    return res.status(500).json({
      message: "Error al actualizar observaciones",
      error: error.message,
    });
  }
}

/**
 * ✅ Actualizar perfil de huésped
 */
async function updateGuestProfile(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const result = await updateGuestProfileService(parseInt(id), updateData);

    if (!result.found) {
      return res.status(404).json({
        found: false,
        message: "Huésped no encontrado",
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error al actualizar perfil de huésped:", error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al actualizar perfil de huésped: ${error.message}`,
      originModule: "guests.controller - updateGuestProfile",
      severity: "low",
      errorObject: error,
    });

    return res.status(500).json({
      message: "Error al actualizar perfil de huésped",
      error: error.message,
    });
  }
}

module.exports = {
  searchGuest,
  createGuest,
  updateGuest,
  getAllGuests,
  getGuestProfile,
  getGuestReservations,
  updateGuestObservations,
  updateGuestProfile,
};
