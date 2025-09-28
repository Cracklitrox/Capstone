const planningService = require('./planning.service');

async function getTapeChart(req, res, next) {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Los parámetros startDate y endDate son requeridos.' });
    }

    // Convertimos los strings a objetos Date
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Validación simple de fechas
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ message: 'Formato de fecha inválido.' });
    }

    const data = await planningService.getTapeChartData(start, end);
    res.status(200).json(data);
  } catch (error) {
    console.error('Error al obtener datos del tape chart:', error);
    next(error); // Pasa el error al manejador de errores global
  }
}

module.exports = {
  getTapeChart,
};