const {
  searchGuestByIdentification,
  createOrUpdateGuest,
  getGuestProfileById,
  getGuestReservationsHistory,
  searchAllGuestsService,
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
 * Crear nuevo huésped
 */
async function createGuest(req, res) {
  try {
    const guestData = req.body;
    const isMainGuest =
      req.body.isMainGuest !== undefined ? req.body.isMainGuest : true;

    // Validaciones básicas
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

    // Validar email solo si es huésped principal
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
    }

    // Verificar si ya existe
    const existing = await searchGuestByIdentification(
      guestData.identificationNumber
    );
    if (existing.found) {
      return res.status(409).json({
        message: "Ya existe un huésped con esta identificación",
        guest: existing.guest,
      });
    }

    // CORREGIDO: Pasar isMainGuest correctamente
    const newGuest = await createOrUpdateGuest(guestData, isMainGuest, false);

    return res.status(201).json({
      message: "Huésped creado exitosamente",
      guest: {
        id: newGuest.id,
        identificationNumber: newGuest.identification_number,
        firstName: newGuest.first_name,
        paternalLastName: newGuest.paternal_last_name,
        maternalLastName: newGuest.maternal_last_name,
        email: newGuest.email,
        phoneNumber: newGuest.phone_number,
        isFullyRegistered: newGuest.is_fully_registered,
      },
    });
  } catch (error) {
    console.error("Error al crear huésped:", error);

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
 * Actualizar huésped existente
 */
async function updateGuest(req, res) {
  try {
    const { id } = req.params;
    const guestData = req.body;
    const isMainGuest =
      req.body.isMainGuest !== undefined ? req.body.isMainGuest : true;

    // CORREGIDO: Pasar todos los parámetros correctamente
    const updatedGuest = await createOrUpdateGuest(
      guestData,
      isMainGuest,
      true,
      parseInt(id)
    );

    return res.status(200).json({
      message: "Huésped actualizado exitosamente",
      guest: {
        id: updatedGuest.id,
        identificationNumber: updatedGuest.identification_number,
        firstName: updatedGuest.first_name,
        paternalLastName: updatedGuest.paternal_last_name,
        isFullyRegistered: updatedGuest.is_fully_registered,
      },
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
 * Obtener perfil completo de huésped por ID
 */
async function getGuestProfile(req, res) {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        message: "ID de huésped inválido",
      });
    }

    const profile = await getGuestProfileById(parseInt(id));

    return res.status(200).json({
      found: true,
      profile: profile
    });
  } catch (error) {
    console.error("Error al obtener perfil de huésped:", error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener perfil de huésped: ${error.message}`,
      originModule: "guests.controller - getGuestProfile",
      severity: "medium",
      errorObject: error,
    });

    if (error.message === 'Huésped no encontrado') {
      return res.status(404).json({
        found: false,
        message: "Huésped no encontrado",
      });
    }

    return res.status(500).json({
      message: "Error al obtener perfil de huésped",
      error: error.message,
    });
  }
}

/**
 * Obtener historial de reservas de huésped
 */
async function getGuestReservations(req, res) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        message: "ID de huésped inválido",
      });
    }

    const filters = {
      status: status || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const reservations = await getGuestReservationsHistory(
      parseInt(id), 
      filters, 
      pagination
    );

    return res.status(200).json(reservations);
  } catch (error) {
    console.error("Error al obtener historial de reservas:", error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener historial de reservas: ${error.message}`,
      originModule: "guests.controller - getGuestReservations",
      severity: "medium",
      errorObject: error,
    });

    return res.status(500).json({
      message: "Error al obtener historial de reservas",
      error: error.message,
    });
  }
}

/**
 * Buscar todos los huéspedes (lista/búsqueda)
 */
async function searchAllGuests(req, res) {
  try {
    const { search = "", page = 1, limit = 20 } = req.query;

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const guests = await searchAllGuestsService(search.trim(), pagination);

    return res.status(200).json(guests);
  } catch (error) {
    console.error("Error al buscar huéspedes:", error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al buscar huéspedes: ${error.message}`,
      originModule: "guests.controller - searchAllGuests",
      severity: "medium",
      errorObject: error,
    });

    return res.status(500).json({
      message: "Error al buscar huéspedes",
      error: error.message,
    });
  }
}

/**
 * Actualizar observaciones de huésped
 */
async function updateGuestObservations(req, res) {
  try {
    const { id } = req.params;
    const { observations } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        message: "ID de huésped inválido",
      });
    }

    const updatedGuest = await updateGuestObservationsService(parseInt(id), observations);

    if (!updatedGuest.found) {
      return res.status(404).json({
        message: "Huésped no encontrado",
      });
    }

    return res.status(200).json({
      message: "Observaciones actualizadas exitosamente",
      guest: updatedGuest.guest,
    });
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
 * Actualizar perfil completo de huésped
 * Permite actualizar múltiples campos del perfil de un huésped con validaciones
 */
async function updateGuestProfile(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validar que el ID sea válido
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        message: "ID de huésped inválido",
      });
    }

    // Validar que se envíe al menos un campo para actualizar
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "Debe proporcionar al menos un campo para actualizar",
      });
    }

    // Validar campos específicos si están presentes
    const validationErrors = [];

    // Validar email
    if (updateData.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (updateData.email && !emailRegex.test(updateData.email)) {
        validationErrors.push("El formato del email es inválido");
      }
    }

    // Validar RUT/Pasaporte
    if (updateData.identificationNumber !== undefined) {
      if (!updateData.identificationNumber || updateData.identificationNumber.trim().length < 3) {
        validationErrors.push("El RUT/Pasaporte debe tener al menos 3 caracteres");
      }
    }

    // Validar teléfono
    if (updateData.phoneNumber !== undefined) {
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,15}$/;
      if (updateData.phoneNumber && !phoneRegex.test(updateData.phoneNumber)) {
        validationErrors.push("El formato del teléfono es inválido");
      }
    }

    // Validar fecha de nacimiento
    if (updateData.birthDate !== undefined) {
      if (updateData.birthDate) {
        const birthDate = new Date(updateData.birthDate);
        const today = new Date();
        const minDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
        
        if (isNaN(birthDate.getTime()) || birthDate > today || birthDate < minDate) {
          validationErrors.push("La fecha de nacimiento es inválida");
        }
      }
    }

    // Validar género
    if (updateData.gender !== undefined) {
      const validGenders = ['male', 'female', 'other'];
      if (updateData.gender && !validGenders.includes(updateData.gender)) {
        validationErrors.push("El género debe ser 'male', 'female' o 'other'");
      }
    }

    // Si hay errores de validación, retornar
    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: "Errores de validación",
        errors: validationErrors,
      });
    }

    // Actualizar el perfil
    const result = await updateGuestProfileService(parseInt(id), updateData);

    if (!result.found) {
      return res.status(404).json({
        message: "Huésped no encontrado",
      });
    }

    return res.status(200).json({
      message: "Perfil actualizado exitosamente",
      guest: result.guest,
    });
  } catch (error) {
    console.error("Error al actualizar perfil de huésped:", error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al actualizar perfil de huésped: ${error.message}`,
      originModule: "guests.controller - updateGuestProfile",
      severity: "medium",
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
  getGuestProfile,
  getGuestReservations,
  searchAllGuests,
  updateGuestObservations,
  updateGuestProfile,
};
