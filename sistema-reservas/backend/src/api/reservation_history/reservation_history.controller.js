const historyService = require("./reservation_history.service");

/**
 * Maneja la petición para obtener el historial de reservas.
 */
const getHistory = async (req, res) => {
  try {
    const { rut, roomId, floor, startDate, endDate, minPrice, maxPrice } =
      req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // ✅ FIX: Mapear correctamente 'rut' a 'identification_number'
    const filters = {
      identification_number: rut,
      roomId,
      floor,
      startDate,
      endDate,
      minPrice,
      maxPrice,
    };
    const pagination = { page, limit };

    const result = await historyService.getHistory(filters, pagination);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error al obtener el historial de reservas:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

/**
 * Maneja la petición para obtener los detalles de una reserva.
 */
const getHistoryDetailById = async (req, res) => {
  try {
    const { id } = req.params;
    const reservationId = parseInt(id);

    if (isNaN(reservationId)) {
      return res
        .status(400)
        .json({ message: "El ID de la reserva debe ser un número." });
    }

    const reservationDetails = await historyService.getHistoryDetailById(
      reservationId
    );
    res.status(200).json(reservationDetails);
  } catch (error) {
    if (error.message.includes("Reserva no encontrada")) {
      return res.status(404).json({ message: error.message });
    }
    console.error("Error al obtener detalles de la reserva:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

/**
 * Maneja la petición para actualizar la observación de una reserva.
 */
const updateObservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { observation } = req.body;

    if (!observation) {
      return res
        .status(400)
        .json({ message: "La observación no puede estar vacía." });
    }

    // Llamamos al servicio para actualizar la observación
    const updatedReservation = await historyService.updateObservation(
      id,
      observation
    );
    res.status(200).json(updatedReservation);
  } catch (error) {
    console.error("Error al actualizar la observación:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

module.exports = {
  getHistory,
  getHistoryDetailById,
  updateObservation,
};
