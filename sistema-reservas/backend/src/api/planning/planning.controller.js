const planningService = require("./planning.service");
const { logError } = require("../../utils/errorLogger");

async function getTapeChart(req, res) {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "Los parámetros startDate y endDate son requeridos.",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        message: "Formato de fecha inválido.",
      });
    }

    const data = await planningService.getTapeChartData(start, end);
    res.status(200).json(data);
  } catch (error) {
    console.error("Error al obtener datos del tape chart:", error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener tape chart (${req.query.startDate} - ${req.query.endDate}): ${error.message}`,
      originModule: "planning.controller - getTapeChart",
      severity: "medium",
      errorObject: error,
    });

    res.status(500).json({
      message: "Error al obtener datos de planificación",
      error: error.message,
    });
  }
}

module.exports = {
  getTapeChart,
};
