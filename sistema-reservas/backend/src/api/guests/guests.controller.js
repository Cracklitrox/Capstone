const {
  searchGuestByIdentification,
  createGuest: createGuestService,
  updateGuest: updateGuestService,
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

module.exports = {
  searchGuest,
  createGuest,
  updateGuest,
};
