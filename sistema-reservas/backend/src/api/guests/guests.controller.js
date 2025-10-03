const {
  searchGuestByIdentification,
  createOrUpdateGuest,
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
      userRole: req.user?.user_roles?.[0]?.roles?.name,
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

    // Validaciones básicas
    if (
      !guestData.identificationNumber ||
      !guestData.firstName ||
      !guestData.paternalLastName ||
      !guestData.email
    ) {
      return res.status(400).json({
        message:
          "Datos incompletos. Identificación, nombre, apellido paterno y email son obligatorios.",
      });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestData.email)) {
      return res.status(400).json({
        message: "Email inválido",
      });
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

    const newGuest = await createOrUpdateGuest(guestData, false);

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
      },
    });
  } catch (error) {
    console.error("Error al crear huésped:", error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
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

    const updatedGuest = await createOrUpdateGuest(
      guestData,
      true,
      parseInt(id)
    );

    return res.status(200).json({
      message: "Huésped actualizado exitosamente",
      guest: updatedGuest,
    });
  } catch (error) {
    console.error("Error al actualizar huésped:", error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.user_roles?.[0]?.roles?.name,
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

module.exports = {
  searchGuest,
  createGuest,
  updateGuest,
};
