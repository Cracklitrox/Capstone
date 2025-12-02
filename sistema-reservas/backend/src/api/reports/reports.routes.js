import express from 'express';
import rateLimit from 'express-rate-limit';
import reportsController from './reports.controller.js';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';

const router = express.Router();

// Limitador de tasa para endpoints de reportes
const reportsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // Límite de 200 solicitudes por ventana por IP (aumentado para pantalla de reportes compleja)
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Demasiadas solicitudes a los reportes. Por favor, inténtalo más tarde.'
});

// Aplicar rate limiting a todas las rutas de reportes
router.use(reportsLimiter);

// ============================================
// FASE 1: KPIs Y MÉTRICAS BÁSICAS
// ============================================

/**
 * @route GET /api/v1/reports/kpis
 * @desc Obtiene los KPIs principales del hotel con comparación de períodos
 * @query startDate, endDate, compareWithPrevious (boolean)
 * @access Administrador y Recepcionista
 */
router.get(
  '/kpis',
  authenticate,
  authorize(['administrator', 'receptionist']),
  reportsController.getKPIs
);

/**
 * @route GET /api/v1/reports/occupancy
 * @desc Obtiene datos de ocupación agrupados por período (diario/semanal/mensual/anual)
 * @query startDate, endDate, groupBy (day|week|month|year), roomTypeId, floor
 * @access Administrador y Recepcionista
 */
router.get(
  '/occupancy',
  authenticate,
  authorize(['administrator', 'receptionist']),
  reportsController.getOccupancy
);

/**
 * @route GET /api/v1/reports/revenue
 * @desc Obtiene datos de ingresos agrupados por período
 * @query startDate, endDate, groupBy (day|week|month|year), includeServices
 * @access Administrador y Recepcionista
 */
router.get(
  '/revenue',
  authenticate,
  authorize(['administrator', 'receptionist']),
  reportsController.getRevenue
);

// ============================================
// FASE 2: ANÁLISIS DE CLIENTES
// ============================================

/**
 * @route GET /api/v1/reports/clients/overview
 * @desc Obtiene resumen general de clientes con filtros y ordenamiento
 * @query startDate, endDate, sortBy (revenue|reservations|frequency), order, limit
 * @access Administrador y Recepcionista
 */
router.get(
  '/clients/overview',
  authenticate,
  authorize(['administrator', 'receptionist']),
  reportsController.getClientsOverview
);

/**
 * @route GET /api/v1/reports/clients/:clientId/detail
 * @desc Obtiene detalles completos de un cliente específico
 * @query startDate, endDate (opcional)
 * @access Administrador y Recepcionista
 */
router.get(
  '/clients/:clientId/detail',
  authenticate,
  authorize(['administrator', 'receptionist']),
  reportsController.getClientDetail
);

/**
 * @route GET /api/v1/reports/clients/revenue-timeline
 * @desc Obtiene línea de tiempo de ingresos por tipo de cliente (nuevos vs recurrentes)
 * @query startDate, endDate, groupBy, clientId (opcional)
 * @access Administrador y Recepcionista
 */
router.get(
  '/clients/revenue-timeline',
  authenticate,
  authorize(['administrator', 'receptionist']),
  reportsController.getClientsRevenueTimeline
);

/**
 * @route GET /api/v1/reports/clients/stats
 * @desc Obtiene estadísticas generales de clientes (total, nuevos, recurrentes)
 * @query startDate, endDate
 * @access Administrador y Recepcionista
 */
router.get(
  '/clients/stats',
  authenticate,
  authorize(['administrator', 'receptionist']),
  reportsController.getClientStats
);

// ============================================
// FASE 3: RANKINGS Y TOP CHARTS
// ============================================

/**
 * @route GET /api/v1/reports/rankings/top-clients
 * @desc Obtiene ranking de mejores clientes por métrica seleccionada
 * @query startDate, endDate, metric (revenue|reservations|frequency), limit
 * @access Administrador y Recepcionista
 */
router.get(
  '/rankings/top-clients',
  authenticate,
  authorize(['administrator', 'receptionist']),
  reportsController.getTopClients
);

/**
 * @route GET /api/v1/reports/rankings/top-rooms
 * @desc Obtiene ranking de mejores habitaciones
 * @query startDate, endDate, metric (revenue|occupancy|reservations)
 * @access Administrador y Recepcionista
 */
router.get(
  '/rankings/top-rooms',
  authenticate,
  authorize(['administrator', 'receptionist']),
  reportsController.getTopRooms
);

/**
 * @route GET /api/v1/reports/rankings/top-room-types
 * @desc Obtiene ranking de tipos de habitación
 * @query startDate, endDate, metric (revenue|popularity|adr)
 * @access Administrador y Recepcionista
 */
router.get(
  '/rankings/top-room-types',
  authenticate,
  authorize(['administrator', 'receptionist']),
  reportsController.getTopRoomTypes
);

/**
 * @route GET /api/v1/reports/rankings/top-services
 * @desc Obtiene ranking de servicios más solicitados
 * @query startDate, endDate
 * @access Administrador y Recepcionista
 */
router.get(
  '/rankings/top-services',
  authenticate,
  authorize(['administrator', 'receptionist']),
  reportsController.getTopServices
);

// ============================================
// FASE 4: COMPARACIONES
// ============================================

/**
 * @route GET /api/v1/reports/comparison/periods
 * @desc Compara métricas entre dos períodos
 * @query period1Start, period1End, period2Start, period2End, metrics
 * @access Administrador
 */
router.get(
  '/comparison/periods',
  authenticate,
  authorize(['administrator']),
  reportsController.comparePeriods
);

/**
 * @route GET /api/v1/reports/comparison/clients
 * @desc Compara métricas entre múltiples clientes
 * @query clientIds (comma-separated), startDate, endDate
 * @access Administrador
 */
router.get(
  '/comparison/clients',
  authenticate,
  authorize(['administrator']),
  reportsController.compareClients
);

/**
 * @route GET /api/v1/reports/total-paid
 * @desc Obtiene el total de paid_amount de todas las reservas completadas
 * @access Todos los roles autenticados
 */
router.get(
  '/total-paid',
  authenticate,
  reportsController.getTotalPaid
);

// ============================================
// REPORTES PERSONALIZADOS
// ============================================

/**
 * @route GET /api/v1/reports/client/:clientId/custom
 * @desc Obtiene reporte detallado personalizado de un cliente específico
 * @query startDate, endDate
 * @access Administrador y Recepcionista
 */
router.get(
  '/client/:clientId/custom',
  authenticate,
  authorize(['administrator', 'receptionist']),
  reportsController.getClientCustomReport
);

/**
 * @route GET /api/v1/reports/room/:roomId/custom
 * @desc Obtiene reporte detallado personalizado de una habitación
 * @query startDate, endDate
 * @access Administrador y Recepcionista
 */
router.get(
  '/room/:roomId/custom',
  authenticate,
  authorize(['administrator', 'receptionist']),
  reportsController.getRoomCustomReport
);

/**
 * @route GET /api/v1/reports/room-type/:roomTypeId/custom
 * @desc Obtiene reporte detallado personalizado de un tipo de habitación
 * @query startDate, endDate
 * @access Administrador y Recepcionista
 */
router.get(
  '/room-type/:roomTypeId/custom',
  authenticate,
  authorize(['administrator', 'receptionist']),
  reportsController.getRoomTypeCustomReport
);

/**
 * @route GET /api/v1/reports/clients/top-revenue
 * @desc Obtiene ranking completo de clientes por ingresos generados
 * @query startDate, endDate, limit
 * @access Administrador y Recepcionista
 */
router.get(
  '/clients/top-revenue',
  authenticate,
  authorize(['administrator', 'receptionist']),
  reportsController.getTopClientsRevenue
);

/**
 * @route GET /api/v1/reports/clients-with-reservations
 * @desc Obtiene lista de clientes que tienen reservas según filtros aplicados
 * @query floor, roomTypeId, startDate, endDate
 * @access Administrador y Recepcionista
 */
router.get(
  '/clients-with-reservations',
  authenticate,
  authorize(['administrator', 'receptionist']),
  reportsController.getClientsWithReservations
);

// ============================================
// NUEVOS REPORTES ESPECIALIZADOS
// ============================================

/**
 * @route GET /api/v1/reports/by-country
 * @desc Obtiene reporte de reservas agrupadas por país
 * @query startDate, endDate
 * @access Administrador y Recepcionista
 */
router.get(
  '/by-country',
  authenticate,
  authorize(['administrator', 'receptionist']),
  reportsController.getReportByCountry
);

/**
 * @route GET /api/v1/reports/available-countries
 * @desc Obtiene lista de países únicos registrados en la BD
 * @access Administrador y Recepcionista
 */
router.get(
  '/available-countries',
  authenticate,
  authorize(['administrator', 'receptionist']),
  reportsController.getAvailableCountries
);

/**
 * @route GET /api/v1/reports/by-age
 * @desc Obtiene reporte de reservas agrupadas por rango de edad
 * @query startDate, endDate, ageRange (opcional)
 * @access Administrador y Recepcionista
 */
router.get(
  '/by-age',
  authenticate,
  authorize(['administrator', 'receptionist']),
  reportsController.getReportByAge
);

/**
 * @route GET /api/v1/reports/by-spending
 * @desc Obtiene reporte de reservas agrupadas por rango de monto
 * @query startDate, endDate, spendingRange (opcional)
 * @access Administrador y Recepcionista
 */
router.get(
  '/by-spending',
  authenticate,
  authorize(['administrator', 'receptionist']),
  reportsController.getReportBySpending
);

export default router;
