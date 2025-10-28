const reportsService = require('./reports.service');
const { logError } = require('../../utils/errorLogger');

// ============================================
// FASE 1: KPIs Y MÉTRICAS BÁSICAS
// ============================================

/**
 * Controlador para obtener KPIs principales
 * @route GET /api/v1/reports/kpis
 */
async function getKPIs(req, res) {
  try {
    const { startDate, endDate, compareWithPrevious = 'true' } = req.query;

    // Validar fechas requeridas
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros startDate y endDate son requeridos'
      });
    }

    const kpis = await reportsService.calculateKPIs(
      startDate,
      endDate,
      compareWithPrevious === 'true'
    );

    return res.status(200).json({
      success: true,
      data: kpis,
      message: 'KPIs obtenidos exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener KPIs:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener KPIs: ${error.message}`,
      originModule: 'reports.controller - getKPIs',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      success: false,
      message: 'Error al obtener los KPIs del hotel',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Controlador para obtener datos de ocupación
 * @route GET /api/v1/reports/occupancy
 */
async function getOccupancy(req, res) {
  try {
    const { startDate, endDate, groupBy = 'day', roomTypeId, floor } = req.query;

    // Validar parámetros requeridos
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros startDate y endDate son requeridos'
      });
    }

    // Validar groupBy
    const validGroupBy = ['hour', 'day', 'week', 'month', 'year'];
    if (!validGroupBy.includes(groupBy)) {
      return res.status(400).json({
        success: false,
        message: `El parámetro groupBy debe ser uno de: ${validGroupBy.join(', ')}`
      });
    }

    const occupancyData = await reportsService.getOccupancyData(
      startDate,
      endDate,
      groupBy,
      roomTypeId ? parseInt(roomTypeId) : null,
      floor ? parseInt(floor) : null
    );

    return res.status(200).json({
      success: true,
      data: occupancyData,
      metadata: {
        startDate,
        endDate,
        groupBy,
        filters: {
          roomTypeId: roomTypeId || null,
          floor: floor || null
        }
      },
      message: 'Datos de ocupación obtenidos exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener datos de ocupación:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener ocupación: ${error.message}`,
      originModule: 'reports.controller - getOccupancy',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      success: false,
      message: 'Error al obtener los datos de ocupación',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Controlador para obtener datos de ingresos
 * @route GET /api/v1/reports/revenue
 */
async function getRevenue(req, res) {
  try {
    const { startDate, endDate, groupBy = 'day', includeServices = 'true', roomTypeId, floor } = req.query;

    // Validar parámetros requeridos
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros startDate y endDate son requeridos'
      });
    }

    // Validar groupBy
    const validGroupBy = ['hour', 'day', 'week', 'month', 'year'];
    if (!validGroupBy.includes(groupBy)) {
      return res.status(400).json({
        success: false,
        message: `El parámetro groupBy debe ser uno de: ${validGroupBy.join(', ')}`
      });
    }

    const revenueData = await reportsService.getRevenueData(
      startDate,
      endDate,
      groupBy,
      includeServices === 'true',
      roomTypeId ? parseInt(roomTypeId) : null,
      floor ? parseInt(floor) : null
    );

    return res.status(200).json({
      success: true,
      data: revenueData,
      metadata: {
        startDate,
        endDate,
        groupBy,
        includeServices: includeServices === 'true'
      },
      message: 'Datos de ingresos obtenidos exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener datos de ingresos:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener ingresos: ${error.message}`,
      originModule: 'reports.controller - getRevenue',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      success: false,
      message: 'Error al obtener los datos de ingresos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// ============================================
// FASE 2: ANÁLISIS DE CLIENTES
// ============================================

/**
 * Controlador para obtener resumen de clientes
 * @route GET /api/v1/reports/clients/overview
 */
async function getClientsOverview(req, res) {
  try {
    const {
      startDate,
      endDate,
      sortBy = 'revenue',
      order = 'desc',
      limit = 10
    } = req.query;

    // Validar fechas
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros startDate y endDate son requeridos'
      });
    }

    // Validar sortBy
    const validSortBy = ['revenue', 'reservations', 'frequency', 'lastVisit'];
    if (!validSortBy.includes(sortBy)) {
      return res.status(400).json({
        success: false,
        message: `El parámetro sortBy debe ser uno de: ${validSortBy.join(', ')}`
      });
    }

    const clientsData = await reportsService.getClientsOverview(
      startDate,
      endDate,
      sortBy,
      order,
      parseInt(limit)
    );

    return res.status(200).json({
      success: true,
      data: clientsData,
      metadata: {
        startDate,
        endDate,
        sortBy,
        order,
        limit: parseInt(limit)
      },
      message: 'Resumen de clientes obtenido exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener resumen de clientes:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener clientes: ${error.message}`,
      originModule: 'reports.controller - getClientsOverview',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      success: false,
      message: 'Error al obtener el resumen de clientes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Controlador para obtener detalle de un cliente
 * @route GET /api/v1/reports/clients/:clientId/detail
 */
async function getClientDetail(req, res) {
  try {
    const { clientId } = req.params;
    const { startDate, endDate } = req.query;

    // Validar clientId
    if (!clientId || isNaN(parseInt(clientId))) {
      return res.status(400).json({
        success: false,
        message: 'El ID del cliente debe ser un número válido'
      });
    }

    const clientDetail = await reportsService.getClientDetail(
      parseInt(clientId),
      startDate || null,
      endDate || null
    );

    if (!clientDetail) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    return res.status(200).json({
      success: true,
      data: clientDetail,
      message: 'Detalle del cliente obtenido exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener detalle del cliente:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener detalle de cliente: ${error.message}`,
      originModule: 'reports.controller - getClientDetail',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      success: false,
      message: 'Error al obtener el detalle del cliente',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Controlador para obtener línea de tiempo de ingresos por clientes
 * @route GET /api/v1/reports/clients/revenue-timeline
 */
async function getClientsRevenueTimeline(req, res) {
  try {
    const { startDate, endDate, groupBy = 'month', clientId } = req.query;

    // Validar fechas
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros startDate y endDate son requeridos'
      });
    }

    const timelineData = await reportsService.getClientsRevenueTimeline(
      startDate,
      endDate,
      groupBy,
      clientId ? parseInt(clientId) : null
    );

    return res.status(200).json({
      success: true,
      data: timelineData,
      metadata: {
        startDate,
        endDate,
        groupBy,
        clientId: clientId || null
      },
      message: 'Línea de tiempo de ingresos obtenida exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener línea de tiempo de ingresos:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener timeline de clientes: ${error.message}`,
      originModule: 'reports.controller - getClientsRevenueTimeline',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      success: false,
      message: 'Error al obtener la línea de tiempo de ingresos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// ============================================
// FASE 3: RANKINGS Y TOP CHARTS
// ============================================

/**
 * Controlador para obtener ranking de mejores clientes
 * @route GET /api/v1/reports/rankings/top-clients
 */
async function getTopClients(req, res) {
  try {
    const { startDate, endDate, metric = 'revenue', limit = 10 } = req.query;

    // Validar fechas
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros startDate y endDate son requeridos'
      });
    }

    // Validar métrica
    const validMetrics = ['revenue', 'reservations', 'frequency'];
    if (!validMetrics.includes(metric)) {
      return res.status(400).json({
        success: false,
        message: `El parámetro metric debe ser uno de: ${validMetrics.join(', ')}`
      });
    }

    const topClients = await reportsService.getTopClients(
      startDate,
      endDate,
      metric,
      parseInt(limit)
    );

    return res.status(200).json({
      success: true,
      data: topClients,
      metadata: {
        metric,
        periodStart: startDate,
        periodEnd: endDate,
        limit: parseInt(limit)
      },
      message: 'Ranking de clientes obtenido exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener top clientes:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener top clientes: ${error.message}`,
      originModule: 'reports.controller - getTopClients',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      success: false,
      message: 'Error al obtener el ranking de clientes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Controlador para obtener ranking de mejores habitaciones
 * @route GET /api/v1/reports/rankings/top-rooms
 */
async function getTopRooms(req, res) {
  try {
    const { startDate, endDate, metric = 'revenue' } = req.query;

    // Validar fechas
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros startDate y endDate son requeridos'
      });
    }

    const topRooms = await reportsService.getTopRooms(startDate, endDate, metric);

    return res.status(200).json({
      success: true,
      data: topRooms,
      metadata: { metric, periodStart: startDate, periodEnd: endDate },
      message: 'Ranking de habitaciones obtenido exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener top habitaciones:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener top habitaciones: ${error.message}`,
      originModule: 'reports.controller - getTopRooms',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      success: false,
      message: 'Error al obtener el ranking de habitaciones',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Controlador para obtener ranking de tipos de habitación
 * @route GET /api/v1/reports/rankings/top-room-types
 */
async function getTopRoomTypes(req, res) {
  try {
    const { startDate, endDate, metric = 'revenue' } = req.query;

    // Validar fechas
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros startDate y endDate son requeridos'
      });
    }

    const topRoomTypes = await reportsService.getTopRoomTypes(startDate, endDate, metric);

    return res.status(200).json({
      success: true,
      data: topRoomTypes,
      metadata: { metric, periodStart: startDate, periodEnd: endDate },
      message: 'Ranking de tipos de habitación obtenido exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener top tipos de habitación:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener top tipos: ${error.message}`,
      originModule: 'reports.controller - getTopRoomTypes',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      success: false,
      message: 'Error al obtener el ranking de tipos de habitación',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Controlador para obtener ranking de servicios
 * @route GET /api/v1/reports/rankings/top-services
 */
async function getTopServices(req, res) {
  try {
    const { startDate, endDate } = req.query;

    // Validar fechas
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros startDate y endDate son requeridos'
      });
    }

    const topServices = await reportsService.getTopServices(startDate, endDate);

    return res.status(200).json({
      success: true,
      data: topServices,
      metadata: { periodStart: startDate, periodEnd: endDate },
      message: 'Ranking de servicios obtenido exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener top servicios:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener top servicios: ${error.message}`,
      originModule: 'reports.controller - getTopServices',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      success: false,
      message: 'Error al obtener el ranking de servicios',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// ============================================
// FASE 4: COMPARACIONES
// ============================================

/**
 * Controlador para comparar períodos
 * @route GET /api/v1/reports/comparison/periods
 */
async function comparePeriods(req, res) {
  try {
    const { period1Start, period1End, period2Start, period2End, metrics } = req.query;

    // Validar parámetros requeridos
    if (!period1Start || !period1End || !period2Start || !period2End) {
      return res.status(400).json({
        success: false,
        message: 'Todos los parámetros de fecha son requeridos: period1Start, period1End, period2Start, period2End'
      });
    }

    const comparison = await reportsService.comparePeriods(
      period1Start,
      period1End,
      period2Start,
      period2End,
      metrics ? metrics.split(',') : ['occupancy', 'revenue', 'reservations']
    );

    return res.status(200).json({
      success: true,
      data: comparison,
      message: 'Comparación de períodos realizada exitosamente'
    });
  } catch (error) {
    console.error('Error al comparar períodos:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al comparar períodos: ${error.message}`,
      originModule: 'reports.controller - comparePeriods',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      success: false,
      message: 'Error al comparar períodos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Controlador para comparar clientes
 * @route GET /api/v1/reports/comparison/clients
 */
async function compareClients(req, res) {
  try {
    const { clientIds, startDate, endDate } = req.query;

    // Validar parámetros requeridos
    if (!clientIds) {
      return res.status(400).json({
        success: false,
        message: 'El parámetro clientIds es requerido (IDs separados por comas)'
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros startDate y endDate son requeridos'
      });
    }

    const ids = clientIds.split(',').map(id => parseInt(id.trim()));

    // Validar que todos los IDs sean números válidos
    if (ids.some(isNaN)) {
      return res.status(400).json({
        success: false,
        message: 'Todos los IDs de clientes deben ser números válidos'
      });
    }

    const comparison = await reportsService.compareClients(ids, startDate, endDate);

    return res.status(200).json({
      success: true,
      data: comparison,
      message: 'Comparación de clientes realizada exitosamente'
    });
  } catch (error) {
    console.error('Error al comparar clientes:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al comparar clientes: ${error.message}`,
      originModule: 'reports.controller - compareClients',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      success: false,
      message: 'Error al comparar clientes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Controlador para obtener estadísticas generales de clientes
 * @route GET /api/v1/reports/clients/stats
 */
async function getClientStats(req, res) {
  try {
    const { startDate, endDate } = req.query;

    // Validar fechas
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros startDate y endDate son requeridos'
      });
    }

    const stats = await reportsService.getClientStats(startDate, endDate);

    return res.status(200).json({
      success: true,
      data: stats,
      metadata: {
        startDate,
        endDate
      },
      message: 'Estadísticas de clientes obtenidas exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener estadísticas de clientes:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener estadísticas de clientes: ${error.message}`,
      originModule: 'reports.controller - getClientStats',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      success: false,
      message: 'Error al obtener las estadísticas de clientes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Controlador para obtener el total de paid_amount
 * @route GET /api/v1/reports/total-paid
 */
async function getTotalPaid(req, res) {
  try {
    const data = await reportsService.getTotalPaidAmount();

    return res.status(200).json({
      success: true,
      data,
      message: 'Total de pagos obtenido exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener total de pagos:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener total de pagos: ${error.message}`,
      originModule: 'reports.controller - getTotalPaid',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      success: false,
      message: 'Error al obtener el total de pagos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Controlador para obtener reporte personalizado de un cliente
 * @route GET /api/v1/reports/client/:clientId/custom
 */
async function getClientCustomReport(req, res) {
  try {
    const { clientId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros startDate y endDate son requeridos'
      });
    }

    const report = await reportsService.getClientCustomReport(clientId, startDate, endDate);

    return res.status(200).json({
      success: true,
      data: report,
      message: 'Reporte de cliente obtenido exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener reporte de cliente:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener reporte de cliente: ${error.message}`,
      originModule: 'reports.controller - getClientCustomReport',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      success: false,
      message: 'Error al obtener el reporte del cliente',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Controlador para obtener reporte personalizado de una habitación
 * @route GET /api/v1/reports/room/:roomId/custom
 */
async function getRoomCustomReport(req, res) {
  try {
    const { roomId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros startDate y endDate son requeridos'
      });
    }

    const report = await reportsService.getRoomCustomReport(roomId, startDate, endDate);

    return res.status(200).json({
      success: true,
      data: report,
      message: 'Reporte de habitación obtenido exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener reporte de habitación:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener reporte de habitación: ${error.message}`,
      originModule: 'reports.controller - getRoomCustomReport',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      success: false,
      message: 'Error al obtener el reporte de la habitación',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Controlador para obtener reporte personalizado de tipo de habitación
 * @route GET /api/v1/reports/room-type/:roomTypeId/custom
 */
async function getRoomTypeCustomReport(req, res) {
  try {
    const { roomTypeId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros startDate y endDate son requeridos'
      });
    }

    const report = await reportsService.getRoomTypeCustomReport(roomTypeId, startDate, endDate);

    return res.status(200).json({
      success: true,
      data: report,
      message: 'Reporte de tipo de habitación obtenido exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener reporte de tipo de habitación:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener reporte de tipo: ${error.message}`,
      originModule: 'reports.controller - getRoomTypeCustomReport',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      success: false,
      message: 'Error al obtener el reporte del tipo de habitación',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Controlador para obtener ranking de clientes por ingresos
 * @route GET /api/v1/reports/clients/top-revenue
 */
async function getTopClientsRevenue(req, res) {
  try {
    const { startDate, endDate, limit = '50' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros startDate y endDate son requeridos'
      });
    }

    const report = await reportsService.getTopClientsRevenue(
      startDate, 
      endDate, 
      parseInt(limit)
    );

    return res.status(200).json({
      success: true,
      data: report,
      message: 'Ranking de clientes obtenido exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener ranking de clientes:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener ranking de clientes: ${error.message}`,
      originModule: 'reports.controller - getTopClientsRevenue',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      success: false,
      message: 'Error al obtener el ranking de clientes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Controlador para obtener clientes que tienen reservas según filtros
 * @route GET /api/v1/reports/clients-with-reservations
 */
async function getClientsWithReservations(req, res) {
  try {
    const { floor, roomTypeId, startDate, endDate } = req.query;

    const clients = await reportsService.getClientsWithReservations({
      floor: floor ? parseInt(floor) : null,
      roomTypeId: roomTypeId ? parseInt(roomTypeId) : null,
      startDate,
      endDate
    });

    return res.status(200).json({
      success: true,
      data: clients,
      message: 'Clientes con reservas obtenidos exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener clientes con reservas:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener clientes con reservas: ${error.message}`,
      originModule: 'reports.controller - getClientsWithReservations',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      success: false,
      message: 'Error al obtener clientes con reservas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Controlador para obtener reporte por país
 * @route GET /api/v1/reports/by-country
 */
async function getReportByCountry(req, res) {
  try {
    const { startDate, endDate, country, floor, roomTypeId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros startDate y endDate son requeridos'
      });
    }

    const report = await reportsService.getReportByCountry(
      startDate, 
      endDate, 
      country || null,
      floor ? parseInt(floor) : null,
      roomTypeId ? parseInt(roomTypeId) : null
    );

    return res.status(200).json({
      success: true,
      data: report,
      message: 'Reporte por país obtenido exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener reporte por país:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener reporte por país: ${error.message}`,
      originModule: 'reports.controller - getReportByCountry',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      success: false,
      message: 'Error al obtener el reporte por país',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Controlador para obtener países disponibles
 * @route GET /api/v1/reports/available-countries
 */
async function getAvailableCountries(req, res) {
  try {
    const countries = await reportsService.getAvailableCountries();

    return res.status(200).json({
      success: true,
      data: countries,
      message: 'Países obtenidos exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener países:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener países: ${error.message}`,
      originModule: 'reports.controller - getAvailableCountries',
      severity: 'low',
      errorObject: error,
    });

    return res.status(500).json({
      success: false,
      message: 'Error al obtener los países',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Controlador para obtener reporte por edad
 * @route GET /api/v1/reports/by-age
 */
async function getReportByAge(req, res) {
  try {
    const { startDate, endDate, ageRange, minAge, maxAge } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros startDate y endDate son requeridos'
      });
    }

    const report = await reportsService.getReportByAge(
      startDate, 
      endDate, 
      ageRange || null,
      minAge ? parseInt(minAge) : null,
      maxAge ? parseInt(maxAge) : null
    );

    return res.status(200).json({
      success: true,
      data: report,
      message: 'Reporte por edad obtenido exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener reporte por edad:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener reporte por edad: ${error.message}`,
      originModule: 'reports.controller - getReportByAge',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      success: false,
      message: 'Error al obtener el reporte por edad',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Controlador para obtener reporte por monto
 * @route GET /api/v1/reports/by-spending
 */
async function getReportBySpending(req, res) {
  try {
    const { startDate, endDate, spendingRange } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Los parámetros startDate y endDate son requeridos'
      });
    }

    const report = await reportsService.getReportBySpending(startDate, endDate, spendingRange || null);

    return res.status(200).json({
      success: true,
      data: report,
      message: 'Reporte por monto obtenido exitosamente'
    });
  } catch (error) {
    console.error('Error al obtener reporte por monto:', error);

    await logError({
      userId: req.user?.id,
      userRole: req.user?.role,
      description: `Error al obtener reporte por monto: ${error.message}`,
      originModule: 'reports.controller - getReportBySpending',
      severity: 'medium',
      errorObject: error,
    });

    return res.status(500).json({
      success: false,
      message: 'Error al obtener el reporte por monto',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

module.exports = {
  getKPIs,
  getOccupancy,
  getRevenue,
  getClientsOverview,
  getClientDetail,
  getClientsRevenueTimeline,
  getClientStats,
  getTopClients,
  getTopRooms,
  getTopRoomTypes,
  getTopServices,
  comparePeriods,
  compareClients,
  getTotalPaid,
  getClientCustomReport,
  getRoomCustomReport,
  getRoomTypeCustomReport,
  getTopClientsRevenue,
  getClientsWithReservations,
  getReportByCountry,
  getAvailableCountries,
  getReportByAge,
  getReportBySpending,
};

