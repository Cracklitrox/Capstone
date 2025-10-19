const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================
// UTILIDADES Y HELPERS
// ============================================

/**
 * Normaliza fechas de inicio y fin para incluir todo el día
 */
function normalizeDateRange(startDate, endDate) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Calcula la diferencia en días entre dos fechas
 */
function getDaysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return days === 0 ? 1 : days; // Mínimo 1 día
}

/**
 * Calcula el período anterior basado en las fechas actuales
 */
function getPreviousPeriod(startDate, endDate) {
  const days = getDaysBetween(startDate, endDate);
  const start = new Date(startDate);
  const previousEnd = new Date(start);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - days + 1);

  return {
    start: previousStart.toISOString().split('T')[0],
    end: previousEnd.toISOString().split('T')[0]
  };
}

/**
 * Formatea una fecha según el tipo de agrupación
 */
function formatPeriodLabel(date, groupBy) {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  switch (groupBy) {
    case 'day': {
      const d = new Date(date);
      return `${d.getDate()} ${months[d.getMonth()]}`;
    }
    case 'week': {
      // Para semanas, el formato es "2025-W41"
      const weekNum = date.split('-W')[1];
      return `Semana ${weekNum}`;
    }
    case 'month': {
      // Para meses, el formato es "2025-10"
      const [year, month] = date.split('-');
      return `${months[parseInt(month) - 1]} ${year}`;
    }
    case 'year':
      return date;
    default:
      return date;
  }
}

/**
 * Obtiene el número de semana del año
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Agrupa datos por período (día, semana, mes, año)
 */
function groupByPeriod(data, dateField, groupBy) {
  const grouped = {};

  data.forEach(item => {
    const date = new Date(item[dateField]);
    let key;

    switch (groupBy) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        const year = date.getFullYear();
        const week = getWeekNumber(date);
        key = `${year}-W${week.toString().padStart(2, '0')}`;
        break;
      case 'month':
        key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        break;
      case 'year':
        key = date.getFullYear().toString();
        break;
      default:
        key = date.toISOString().split('T')[0];
    }

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  });

  return grouped;
}

// ============================================
// FASE 1: KPIs Y MÉTRICAS BÁSICAS
// ============================================

/**
 * Calcula los KPIs principales del hotel
 */
async function calculateKPIs(startDate, endDate, compareWithPrevious = true) {
  // Normalizar fechas para incluir todo el día
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Total de habitaciones en el hotel
  const totalRooms = await prisma.rooms.count({
    where: { is_active: true }
  });

  // Reservas en el período actual - Solo reservas confirmadas, en progreso o completadas
  const reservations = await prisma.reservations.findMany({
    where: {
      deleted_at: null,
      status: { in: ['confirmed', 'in_progress', 'completed'] },
      OR: [
        {
          check_in_date: { gte: start, lte: end }
        },
        {
          check_out_date: { gte: start, lte: end }
        },
        {
          AND: [
            { check_in_date: { lte: start } },
            { check_out_date: { gte: end } }
          ]
        }
      ]
    },
    include: {
      reservation_rooms: {
        where: { deleted_at: null }
      },
      payments: {
        where: {
          status: 'confirmed',
          deleted_at: null
        }
      }
    }
  });

  // Calcular métricas del período actual
  const totalReservations = reservations.length;
  const totalRevenue = reservations.reduce((sum, res) => {
    const paidAmount = res.payments.reduce((pSum, payment) => pSum + payment.amount, 0);
    return sum + paidAmount;
  }, 0);

  // Calcular noches de habitación ocupadas
  let totalRoomNights = 0;
  reservations.forEach(res => {
    res.reservation_rooms.forEach(rr => {
      const rrStart = new Date(rr.start_date);
      const rrEnd = new Date(rr.end_date);
      const checkIn = new Date(Math.max(rrStart, start));
      const checkOut = new Date(Math.min(rrEnd, end));
      
      if (checkOut > checkIn) {
        const nights = getDaysBetween(checkIn, checkOut);
        totalRoomNights += nights;
      }
    });
  });

  // Calcular noches disponibles totales en el período
  const totalDays = getDaysBetween(start, end) + 1;
  const totalAvailableRoomNights = totalRooms * totalDays;

  // Calcular métricas
  const occupancyRate = totalAvailableRoomNights > 0 
    ? (totalRoomNights / totalAvailableRoomNights) * 100 
    : 0;
  
  const revPAR = totalAvailableRoomNights > 0 
    ? totalRevenue / totalAvailableRoomNights 
    : 0;
  
  const adr = totalRoomNights > 0 
    ? totalRevenue / totalRoomNights 
    : 0;

  // Contar clientes únicos
  const uniqueClients = new Set(reservations.map(r => r.main_guest_id));
  const totalClients = uniqueClients.size;

  // Identificar clientes nuevos (primera reserva en el período)
  const clientIds = Array.from(uniqueClients);
  let newClientsCount = 0;
  
  for (const clientId of clientIds) {
    const firstReservation = await prisma.reservations.findFirst({
      where: {
        main_guest_id: clientId,
        deleted_at: null
      },
      orderBy: { created_at: 'asc' }
    });
    
    if (firstReservation && firstReservation.created_at >= start && firstReservation.created_at <= end) {
      newClientsCount++;
    }
  }

  // Calcular tasa de cancelación
  const cancelledReservations = await prisma.reservations.count({
    where: {
      deleted_at: null,
      status: 'canceled',
      check_in_date: { gte: start, lte: end }
    }
  });

  const totalScheduledReservations = totalReservations + cancelledReservations;
  const cancellationRate = totalScheduledReservations > 0 
    ? (cancelledReservations / totalScheduledReservations) * 100 
    : 0;

  // Calcular tasa de no-show
  const noShowReservations = await prisma.reservations.count({
    where: {
      deleted_at: null,
      status: 'no_show',
      check_in_date: { gte: start, lte: end }
    }
  });

  const noShowRate = totalScheduledReservations > 0 
    ? (noShowReservations / totalScheduledReservations) * 100 
    : 0;

  // Calcular duración promedio de estadía
  let totalNights = 0;
  let reservationCount = 0;
  reservations.forEach(res => {
    const checkIn = new Date(res.check_in_date);
    const checkOut = new Date(res.check_out_date);
    totalNights += getDaysBetween(checkIn, checkOut);
    reservationCount++;
  });
  const averageStayDuration = reservationCount > 0 ? totalNights / reservationCount : 0;

  const currentKPIs = {
    occupancyRate: parseFloat(occupancyRate.toFixed(2)),
    totalRevenue: Math.round(totalRevenue),
    revPAR: parseFloat(revPAR.toFixed(2)),
    adr: parseFloat(adr.toFixed(2)),
    totalReservations,
    averageStayDuration: parseFloat(averageStayDuration.toFixed(2)),
    totalClients,
    newClients: newClientsCount,
    returningClients: totalClients - newClientsCount,
    cancellationRate: parseFloat(cancellationRate.toFixed(2)),
    noShowRate: parseFloat(noShowRate.toFixed(2))
  };

  // Si no se requiere comparación, retornar solo el período actual
  if (!compareWithPrevious) {
    return { current: currentKPIs };
  }

  // Calcular KPIs del período anterior
  const previousPeriod = getPreviousPeriod(startDate, endDate);
  const previousKPIs = await calculateKPIs(previousPeriod.start, previousPeriod.end, false);

  // Calcular tendencias (% de cambio)
  const calculateChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return parseFloat((((current - previous) / previous) * 100).toFixed(2));
  };

  const trends = {
    occupancyRate: calculateChange(currentKPIs.occupancyRate, previousKPIs.current.occupancyRate),
    totalRevenue: calculateChange(currentKPIs.totalRevenue, previousKPIs.current.totalRevenue),
    revPAR: calculateChange(currentKPIs.revPAR, previousKPIs.current.revPAR),
    adr: calculateChange(currentKPIs.adr, previousKPIs.current.adr),
    totalReservations: calculateChange(currentKPIs.totalReservations, previousKPIs.current.totalReservations),
    totalClients: calculateChange(currentKPIs.totalClients, previousKPIs.current.totalClients),
    cancellationRate: calculateChange(currentKPIs.cancellationRate, previousKPIs.current.cancellationRate),
    noShowRate: calculateChange(currentKPIs.noShowRate, previousKPIs.current.noShowRate)
  };

  return {
    current: currentKPIs,
    previous: previousKPIs.current,
    trends
  };
}

/**
 * Obtiene datos de ocupación agrupados por período
 */
async function getOccupancyData(startDate, endDate, groupBy, roomTypeId = null, floor = null) {
  // Normalizar fechas para incluir todo el día
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Construir filtros para habitaciones
  const roomFilters = {
    is_active: true,
    ...(roomTypeId && { room_type_id: roomTypeId }),
    ...(floor && { floor })
  };

  // Obtener habitaciones que cumplen los filtros
  const rooms = await prisma.rooms.findMany({
    where: roomFilters
  });

  const totalRooms = rooms.length;
  const roomIds = rooms.map(r => r.id);

  // Si no hay habitaciones, retornar array vacío
  if (totalRooms === 0 || roomIds.length === 0) {
    return [];
  }

  // Obtener todas las reservas de habitaciones en el período
  const reservationRooms = await prisma.reservation_rooms.findMany({
    where: {
      deleted_at: null,
      room_id: { in: roomIds },
      OR: [
        {
          start_date: { gte: start, lte: end }
        },
        {
          end_date: { gte: start, lte: end }
        },
        {
          AND: [
            { start_date: { lte: start } },
            { end_date: { gte: end } }
          ]
        }
      ],
      reservations: {
        deleted_at: null,
        status: 'completed' // SOLO reservas completadas
      }
    },
    include: {
      reservations: true
    }
  });

  // Agrupar datos por período
  const grouped = groupByPeriod(reservationRooms, 'start_date', groupBy);

  // Calcular métricas para cada grupo
  const result = Object.keys(grouped).sort().map(period => {
    const periodData = grouped[period];
    
    // Calcular noches ocupadas en este período
    let occupiedRoomNights = 0;
    periodData.forEach(rr => {
      const rrStart = new Date(rr.start_date);
      const rrEnd = new Date(rr.end_date);
      const checkIn = new Date(Math.max(rrStart, start));
      const checkOut = new Date(Math.min(rrEnd, end));
      
      if (checkOut > checkIn) {
        const nights = getDaysBetween(checkIn, checkOut);
        occupiedRoomNights += nights;
      }
    });

    // Calcular días en este período - CORREGIDO
    let periodDays;
    if (groupBy === 'day') {
      periodDays = 1;
    } else if (groupBy === 'week') {
      periodDays = 7;
    } else if (groupBy === 'month') {
      // Corregido: calcular días correctamente para el mes
      const [year, month] = period.split('-');
      // new Date(year, month, 0) da el último día del mes anterior
      // new Date(year, month, 1) es el primer día del mes
      const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
      periodDays = daysInMonth;
    } else if (groupBy === 'year') {
      const year = parseInt(period);
      periodDays = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0) ? 366 : 365;
    } else {
      periodDays = 1; // fallback
    }

    const totalAvailableNights = totalRooms * periodDays;
    const occupancyRate = totalAvailableNights > 0 
      ? (occupiedRoomNights / totalAvailableNights) * 100 
      : 0;

    const uniqueReservations = new Set(periodData.map(rr => rr.reservation_id));

    return {
      period,
      periodLabel: formatPeriodLabel(period, groupBy),
      occupancyRate: parseFloat(occupancyRate.toFixed(2)),
      totalRooms,
      occupiedRoomNights,
      availableRoomNights: totalAvailableNights - occupiedRoomNights,
      reservationCount: uniqueReservations.size
    };
  });

  return result;
}

/**
 * Obtiene datos de ingresos agrupados por período
 */
async function getRevenueData(startDate, endDate, groupBy, includeServices = true) {
  // Normalizar fechas para incluir todo el día
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Obtener reservas con pagos en el período - CORREGIDO: considerar cualquier reserva que se superponga
  // Solo incluir reservas COMPLETADAS (no confirmed ni in_progress)
  const reservations = await prisma.reservations.findMany({
    where: {
      deleted_at: null,
      status: 'completed', // SOLO reservas completadas
      OR: [
        {
          check_in_date: { gte: start, lte: end }
        },
        {
          check_out_date: { gte: start, lte: end }
        },
        {
          AND: [
            { check_in_date: { lte: start } },
            { check_out_date: { gte: end } }
          ]
        }
      ]
    },
    include: {
      reservation_rooms: {
        where: { deleted_at: null }
      },
      reservation_services: includeServices ? {
        where: { deleted_at: null }
      } : false,
      payments: {
        where: {
          status: 'confirmed',
          deleted_at: null
        }
      }
    }
  });

  // Agrupar por período - usar check_in_date como referencia
  const grouped = groupByPeriod(reservations, 'check_in_date', groupBy);

  // Calcular métricas para cada grupo
  const result = Object.keys(grouped).sort().map(period => {
    const periodData = grouped[period];

    let roomRevenue = 0;
    let servicesRevenue = 0;
    let totalRoomNights = 0;

    periodData.forEach(res => {
      // Ingresos de habitaciones - considerar solo las noches dentro del período
      res.reservation_rooms.forEach(rr => {
        const rrStart = new Date(rr.start_date);
        const rrEnd = new Date(rr.end_date);
        const checkIn = new Date(Math.max(rrStart, start));
        const checkOut = new Date(Math.min(rrEnd, end));
        
        if (checkOut > checkIn) {
          const nights = getDaysBetween(checkIn, checkOut);
          totalRoomNights += nights;
          // Calcular proporción del subtotal que corresponde a este período
          const totalNights = getDaysBetween(rrStart, rrEnd);
          const proportionalRevenue = (rr.subtotal / totalNights) * nights;
          roomRevenue += proportionalRevenue;
        }
      });

      // Ingresos de servicios
      if (includeServices && res.reservation_services) {
        const servicesSubtotal = res.reservation_services.reduce((sum, rs) => sum + rs.subtotal, 0);
        servicesRevenue += servicesSubtotal;
      }
    });

    const totalRevenue = roomRevenue + servicesRevenue;
    const reservationCount = periodData.length;
    const averageReservationValue = reservationCount > 0 ? totalRevenue / reservationCount : 0;
    const adr = totalRoomNights > 0 ? roomRevenue / totalRoomNights : 0;

    return {
      period,
      periodLabel: formatPeriodLabel(period, groupBy),
      totalRevenue: Math.round(totalRevenue),
      roomRevenue: Math.round(roomRevenue),
      servicesRevenue: Math.round(servicesRevenue),
      reservationCount,
      averageReservationValue: parseFloat(averageReservationValue.toFixed(2)),
      adr: parseFloat(adr.toFixed(2)),
      totalRoomNights
    };
  });

  return result;
}

// ============================================
// FASE 2: ANÁLISIS DE CLIENTES
// ============================================

/**
 * Obtiene resumen de clientes con filtros
 */
async function getClientsOverview(startDate, endDate, sortBy, order, limit) {
  const { start, end } = normalizeDateRange(startDate, endDate);

  // Obtener todos los clientes que tuvieron reservas COMPLETED en el período
  const clientReservations = await prisma.reservations.groupBy({
    by: ['main_guest_id'],
    where: {
      deleted_at: null,
      status: 'completed', // SOLO reservas completadas
      check_in_date: { gte: start, lte: end }
    },
    _count: {
      id: true
    }
  });

  // Obtener datos detallados de cada cliente
  const clientsData = await Promise.all(
    clientReservations.map(async (cr) => {
      const user = await prisma.users.findUnique({
        where: { id: cr.main_guest_id },
        select: {
          id: true,
          first_name: true,
          paternal_last_name: true,
          maternal_last_name: true,
          email: true,
          phone_number: true
        }
      });

      // Obtener reservas COMPLETED del cliente en el período
      const reservations = await prisma.reservations.findMany({
        where: {
          main_guest_id: cr.main_guest_id,
          deleted_at: null,
          status: 'completed', // SOLO reservas completadas
          check_in_date: { gte: start, lte: end }
        },
        include: {
          payments: {
            where: {
              status: 'confirmed',
              deleted_at: null
            }
          },
          reservation_rooms: {
            where: { deleted_at: null },
            include: {
              rooms: {
                include: {
                  room_types: true
                }
              }
            }
          }
        },
        orderBy: { check_in_date: 'desc' }
      });

      // Calcular total gastado
      const totalSpent = reservations.reduce((sum, res) => {
        const paid = res.payments.reduce((pSum, payment) => pSum + payment.amount, 0);
        return sum + paid;
      }, 0);

      // Tipo de habitación favorito
      const roomTypeCounts = {};
      reservations.forEach(res => {
        res.reservation_rooms.forEach(rr => {
          const typeName = rr.rooms.room_types.name;
          roomTypeCounts[typeName] = (roomTypeCounts[typeName] || 0) + 1;
        });
      });
      const favoriteRoomType = Object.keys(roomTypeCounts).sort((a, b) => 
        roomTypeCounts[b] - roomTypeCounts[a]
      )[0] || null;

      // Primera y última reserva (de todas, no solo del período)
      const firstReservation = await prisma.reservations.findFirst({
        where: {
          main_guest_id: cr.main_guest_id,
          deleted_at: null
        },
        orderBy: { created_at: 'asc' },
        select: { created_at: true }
      });

      const lastReservation = reservations[0];

      return {
        userId: user.id,
        fullName: `${user.first_name} ${user.paternal_last_name} ${user.maternal_last_name || ''}`.trim(),
        email: user.email,
        phone: user.phone_number,
        totalReservations: cr._count.id,
        totalSpent: Math.round(totalSpent),
        averageReservationValue: Math.round(totalSpent / cr._count.id),
        firstReservation: firstReservation?.created_at || null,
        lastReservation: lastReservation?.check_in_date || null,
        favoriteRoomType,
        lifetimeValue: Math.round(totalSpent),
        reservationsThisPeriod: cr._count.id
      };
    })
  );

  // Ordenar según el criterio especificado
  const sortField = sortBy === 'revenue' ? 'totalSpent' : 
                    sortBy === 'reservations' ? 'totalReservations' :
                    sortBy === 'frequency' ? 'totalReservations' : 'lastReservation';

  clientsData.sort((a, b) => {
    if (order === 'asc') {
      return a[sortField] > b[sortField] ? 1 : -1;
    } else {
      return a[sortField] < b[sortField] ? 1 : -1;
    }
  });

  // Contar nuevos vs recurrentes
  const newClientsCount = clientsData.filter(c => {
    if (!c.firstReservation) return false;
    const firstDate = new Date(c.firstReservation);
    return firstDate >= start && firstDate <= end;
  }).length;

  return {
    totalClients: clientsData.length,
    newClients: newClientsCount,
    returningClients: clientsData.length - newClientsCount,
    clients: clientsData.slice(0, limit)
  };
}

/**
 * Obtiene detalle completo de un cliente
 */
async function getClientDetail(clientId, startDate = null, endDate = null) {
  // Verificar que el cliente existe
  const user = await prisma.users.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      first_name: true,
      paternal_last_name: true,
      maternal_last_name: true,
      email: true,
      phone_number: true,
      created_at: true
    }
  });

  if (!user) return null;

  // Construir filtros de fecha si se proporcionan
  let dateFilter = {};
  if (startDate && endDate) {
    const { start, end } = normalizeDateRange(startDate, endDate);
    dateFilter = {
      check_in_date: {
        gte: start,
        lte: end
      }
    };
  }

  // Obtener todas las reservas del cliente
  const reservations = await prisma.reservations.findMany({
    where: {
      main_guest_id: clientId,
      deleted_at: null,
      status: { in: ['confirmed', 'in_progress', 'completed'] },
      ...dateFilter
    },
    include: {
      reservation_rooms: {
        where: { deleted_at: null },
        include: {
          rooms: {
            include: {
              room_types: true
            }
          }
        }
      },
      reservation_services: {
        where: { deleted_at: null },
        include: {
          services: true
        }
      },
      payments: {
        where: {
          status: 'confirmed',
          deleted_at: null
        }
      }
    },
    orderBy: { check_in_date: 'desc' }
  });

  // Calcular métricas generales
  const totalReservations = reservations.length;
  const totalSpent = reservations.reduce((sum, res) => {
    const paid = res.payments.reduce((pSum, p) => pSum + p.amount, 0);
    return sum + paid;
  }, 0);

  let totalNights = 0;
  reservations.forEach(res => {
    res.reservation_rooms.forEach(rr => {
      totalNights += getDaysBetween(rr.start_date, rr.end_date);
    });
  });
  const averageStay = totalReservations > 0 ? totalNights / totalReservations : 0;

  // Tipos de habitación preferidos
  const roomTypeCounts = {};
  reservations.forEach(res => {
    res.reservation_rooms.forEach(rr => {
      const typeName = rr.rooms.room_types.name;
      roomTypeCounts[typeName] = (roomTypeCounts[typeName] || 0) + 1;
    });
  });
  const preferredRoomTypes = Object.keys(roomTypeCounts)
    .sort((a, b) => roomTypeCounts[b] - roomTypeCounts[a])
    .slice(0, 3);

  // Servicios utilizados
  const serviceStats = {};
  reservations.forEach(res => {
    res.reservation_services?.forEach(rs => {
      const serviceName = rs.services.name;
      if (!serviceStats[serviceName]) {
        serviceStats[serviceName] = { times: 0, totalSpent: 0 };
      }
      serviceStats[serviceName].times += rs.quantity;
      serviceStats[serviceName].totalSpent += rs.subtotal;
    });
  });
  const servicesUsed = Object.keys(serviceStats).map(name => ({
    serviceName: name,
    times: serviceStats[name].times,
    totalSpent: Math.round(serviceStats[name].totalSpent)
  }));

  // Gasto mensual
  const monthlySpending = {};
  reservations.forEach(res => {
    const month = res.check_in_date.toISOString().substring(0, 7);
    const amount = res.payments.reduce((sum, p) => sum + p.amount, 0);
    if (!monthlySpending[month]) {
      monthlySpending[month] = { amount: 0, reservations: 0 };
    }
    monthlySpending[month].amount += amount;
    monthlySpending[month].reservations++;
  });

  const monthlySpendingArray = Object.keys(monthlySpending).sort().map(month => ({
    month,
    amount: Math.round(monthlySpending[month].amount),
    reservations: monthlySpending[month].reservations
  }));

  // Historial de reservas simplificado
  const reservationsHistory = reservations.map(res => ({
    id: res.id,
    code: res.code,
    checkIn: res.check_in_date,
    checkOut: res.check_out_date,
    nights: res.reservation_rooms.reduce((sum, rr) => 
      sum + getDaysBetween(rr.start_date, rr.end_date), 0
    ),
    roomType: res.reservation_rooms[0]?.rooms.room_types.name || 'N/A',
    totalAmount: Math.round(res.payments.reduce((sum, p) => sum + p.amount, 0)),
    status: res.status
  }));

  return {
    client: {
      userId: user.id,
      fullName: `${user.first_name} ${user.paternal_last_name} ${user.maternal_last_name || ''}`.trim(),
      email: user.email,
      phone: user.phone_number,
      registrationDate: user.created_at,
      totalReservations,
      totalSpent: Math.round(totalSpent),
      averageStay: parseFloat(averageStay.toFixed(2)),
      preferredRoomTypes
    },
    reservations: reservationsHistory,
    monthlySpending: monthlySpendingArray,
    servicesUsed
  };
}

/**
 * Obtiene línea de tiempo de ingresos por tipo de cliente
 */
async function getClientsRevenueTimeline(startDate, endDate, groupBy, clientId = null) {
  const { start, end } = normalizeDateRange(startDate, endDate);

  // Filtro base
  const whereClause = {
    deleted_at: null,
    status: { in: ['confirmed', 'in_progress', 'completed'] },
    check_in_date: { gte: start, lte: end },
    ...(clientId && { main_guest_id: clientId })
  };

  // Obtener reservas
  const reservations = await prisma.reservations.findMany({
    where: whereClause,
    include: {
      payments: {
        where: {
          status: 'confirmed',
          deleted_at: null
        }
      }
    }
  });

  // Si es un cliente específico, retornar su timeline
  if (clientId) {
    const grouped = groupByPeriod(reservations, 'check_in_date', groupBy);
    return Object.keys(grouped).sort().map(period => {
      const periodData = grouped[period];
      const revenue = periodData.reduce((sum, res) => {
        return sum + res.payments.reduce((pSum, p) => pSum + p.amount, 0);
      }, 0);

      return {
        period,
        periodLabel: formatPeriodLabel(period, groupBy),
        revenue: Math.round(revenue),
        reservations: periodData.length
      };
    });
  }

  // Para todos los clientes: separar nuevos vs recurrentes
  const clientFirstReservations = {};
  
  for (const res of reservations) {
    if (!clientFirstReservations[res.main_guest_id]) {
      const firstRes = await prisma.reservations.findFirst({
        where: {
          main_guest_id: res.main_guest_id,
          deleted_at: null
        },
        orderBy: { created_at: 'asc' }
      });
      clientFirstReservations[res.main_guest_id] = firstRes.created_at;
    }
  }

  // Clasificar reservas
  const newClientReservations = [];
  const returningClientReservations = [];

  reservations.forEach(res => {
    const firstDate = clientFirstReservations[res.main_guest_id];
    if (firstDate >= start && firstDate <= end) {
      newClientReservations.push(res);
    } else {
      returningClientReservations.push(res);
    }
  });

  // Agrupar por período
  const newGrouped = groupByPeriod(newClientReservations, 'check_in_date', groupBy);
  const returningGrouped = groupByPeriod(returningClientReservations, 'check_in_date', groupBy);

  // Combinar resultados
  const allPeriods = new Set([...Object.keys(newGrouped), ...Object.keys(returningGrouped)]);
  
  return Array.from(allPeriods).sort().map(period => {
    const newData = newGrouped[period] || [];
    const returningData = returningGrouped[period] || [];

    const newRevenue = newData.reduce((sum, res) => {
      return sum + res.payments.reduce((pSum, p) => pSum + p.amount, 0);
    }, 0);

    const returningRevenue = returningData.reduce((sum, res) => {
      return sum + res.payments.reduce((pSum, p) => pSum + p.amount, 0);
    }, 0);

    return {
      period,
      periodLabel: formatPeriodLabel(period, groupBy),
      newClientsRevenue: Math.round(newRevenue),
      returningClientsRevenue: Math.round(returningRevenue),
      newClientsCount: newData.length,
      returningClientsCount: returningData.length
    };
  });
}

/**
 * Obtiene estadísticas generales de clientes (total, nuevos, recurrentes)
 */
async function getClientStats(startDate, endDate) {
  const { start, end } = normalizeDateRange(startDate, endDate);

  // Obtener el TOTAL de clientes registrados en el sistema (todos los usuarios con role='guest')
  const allClients = await prisma.users.findMany({
    where: {
      deleted_at: null,
      role: 'guest'
    },
    select: { id: true, created_at: true }
  });

  const totalClientsCount = allClients.length;

  // Obtener clientes que hicieron reservas COMPLETED en el período (para estadísticas)
  const clientsInPeriod = await prisma.reservations.groupBy({
    by: ['main_guest_id'],
    where: {
      deleted_at: null,
      status: 'completed', // Solo reservas completadas
      check_in_date: { gte: start, lte: end }
    },
    _count: {
      id: true
    }
  });

  // Identificar clientes nuevos (registrados en este período)
  let newClientsCount = 0;
  let recurringClientsCount = 0;

  for (const client of allClients) {
    const registrationDate = new Date(client.created_at);
    if (registrationDate >= start && registrationDate <= end) {
      newClientsCount++;
    } else {
      recurringClientsCount++;
    }
  }

  // Calcular segmentación por tipo de cliente con colores para el frontend
  const segmentation = [
    {
      name: 'Nuevos',
      value: newClientsCount,
      percentage: totalClientsCount > 0 ? Math.round((newClientsCount / totalClientsCount) * 100) : 0,
      color: '#3b82f6'
    },
    {
      name: 'Recurrentes',
      value: recurringClientsCount,
      percentage: totalClientsCount > 0 ? Math.round((recurringClientsCount / totalClientsCount) * 100) : 0,
      color: '#10b981'
    }
  ];

  return {
    totalClients: totalClientsCount,
    newClients: newClientsCount,
    recurringClients: recurringClientsCount,
    segmentation
  };
}

// ============================================
// FASE 3: RANKINGS
// ============================================

/**
 * Obtiene ranking de mejores clientes
 */
async function getTopClients(startDate, endDate, metric, limit) {
  const clientsData = await getClientsOverview(startDate, endDate, metric, 'desc', limit);
  
  const ranking = clientsData.clients.map((client, index) => ({
    rank: index + 1,
    userId: client.userId,
    fullName: client.fullName,
    email: client.email,
    value: metric === 'revenue' ? client.totalSpent : client.totalReservations,
    reservationCount: client.totalReservations,
    totalSpent: client.totalSpent,
    lastReservation: client.lastReservation,
    trend: 'neutral' // Se puede calcular comparando con período anterior
  }));

  return {
    metric,
    periodStart: startDate,
    periodEnd: endDate,
    ranking
  };
}

/**
 * Obtiene ranking de mejores habitaciones
 */
async function getTopRooms(startDate, endDate, metric) {
  const { start, end } = normalizeDateRange(startDate, endDate);

  // Obtener todas las reservation_rooms en el período
  const reservationRooms = await prisma.reservation_rooms.findMany({
    where: {
      deleted_at: null,
      OR: [
        { start_date: { gte: start, lte: end } },
        { end_date: { gte: start, lte: end } },
        {
          AND: [
            { start_date: { lte: start } },
            { end_date: { gte: end } }
          ]
        }
      ]
    },
    include: {
      rooms: {
        include: {
          room_types: true
        }
      },
      reservations: {
        where: {
          deleted_at: null
        },
        include: {
          payments: {
            where: {
              status: 'confirmed',
              deleted_at: null
            }
          }
        }
      }
    }
  });

  // Agrupar por habitación
  const roomStats = {};
  reservationRooms.forEach(rr => {
    const roomId = rr.room_id;
    if (!roomStats[roomId]) {
      roomStats[roomId] = {
        roomId,
        roomNumber: rr.rooms.room_number,
        roomType: rr.rooms.room_types.name,
        floor: rr.rooms.floor,
        revenue: 0,
        nights: 0,
        reservations: new Set()
      };
    }

    roomStats[roomId].revenue += rr.subtotal;
    roomStats[roomId].nights += getDaysBetween(rr.start_date, rr.end_date);
    roomStats[roomId].reservations.add(rr.reservation_id);
  });

  // Calcular métricas
  const totalDays = getDaysBetween(start, end);
  const roomsArray = Object.values(roomStats).map(room => {
    // Eliminar el Set de reservations antes de retornar
    const reservationCount = room.reservations.size;
    delete room.reservations;
    
    return {
      ...room,
      reservationCount,
      occupancyRate: parseFloat(((room.nights / totalDays) * 100).toFixed(2)),
      averageNightlyRate: room.nights > 0 ? Math.round(room.revenue / room.nights) : 0,
      revenue: Math.round(room.revenue)
    };
  });

  // Ordenar según métrica
  roomsArray.sort((a, b) => {
    if (metric === 'revenue') return b.revenue - a.revenue;
    if (metric === 'occupancy') return b.occupancyRate - a.occupancyRate;
    if (metric === 'reservations') return b.reservationCount - a.reservationCount;
    return 0;
  });

  // Agregar ranking
  return roomsArray.map((room, index) => ({
    rank: index + 1,
    ...room
  }));
}

/**
 * Obtiene ranking de tipos de habitación
 */
async function getTopRoomTypes(startDate, endDate, metric) {
  const { start, end } = normalizeDateRange(startDate, endDate);

  // Obtener todos los tipos de habitación
  const roomTypes = await prisma.room_types.findMany({
    where: { is_active: true },
    include: {
      rooms: {
        where: { is_active: true },
        include: {
          reservation_rooms: {
            where: {
              deleted_at: null,
              OR: [
                { start_date: { gte: start, lte: end } },
                { end_date: { gte: start, lte: end } }
              ]
            }
          }
        }
      }
    }
  });

  // Calcular estadísticas por tipo
  const typeStats = roomTypes.map(type => {
    let totalRevenue = 0;
    let totalNights = 0;
    const reservations = new Set();

    type.rooms.forEach(room => {
      room.reservation_rooms.forEach(rr => {
        totalRevenue += rr.subtotal;
        totalNights += getDaysBetween(rr.start_date, rr.end_date);
        reservations.add(rr.reservation_id);
      });
    });

    const totalDays = getDaysBetween(start, end) + 1;
    const totalRooms = type.rooms.length;
    const totalPossibleNights = totalRooms * totalDays;
    const occupancyRate = totalPossibleNights > 0 ? (totalNights / totalPossibleNights) * 100 : 0;
    const adr = totalNights > 0 ? totalRevenue / totalNights : 0;

    return {
      roomTypeId: type.id,
      roomTypeName: type.name,
      totalRevenue: Math.round(totalRevenue),
      reservationCount: reservations.size,
      averageOccupancy: parseFloat(occupancyRate.toFixed(2)),
      adr: Math.round(adr),
      totalNights
    };
  });

  // Calcular porcentaje del total
  const totalRevenue = typeStats.reduce((sum, t) => sum + t.totalRevenue, 0);
  typeStats.forEach(type => {
    type.percentageOfTotal = totalRevenue > 0 
      ? parseFloat(((type.totalRevenue / totalRevenue) * 100).toFixed(2)) 
      : 0;
  });

  // Ordenar según métrica
  typeStats.sort((a, b) => {
    if (metric === 'revenue') return b.totalRevenue - a.totalRevenue;
    if (metric === 'popularity') return b.reservationCount - a.reservationCount;
    if (metric === 'adr') return b.adr - a.adr;
    return 0;
  });

  // Agregar ranking
  return typeStats.map((type, index) => ({
    rank: index + 1,
    ...type
  }));
}

/**
 * Obtiene ranking de servicios
 */
async function getTopServices(startDate, endDate) {
  const { start, end } = normalizeDateRange(startDate, endDate);

  // Obtener todos los servicios utilizados en el período
  const reservationServices = await prisma.reservation_services.findMany({
    where: {
      deleted_at: null,
      reservations: {
        check_in_date: { gte: start, lte: end },
        deleted_at: null
      }
    },
    include: {
      services: true,
      reservations: true
    }
  });

  // Agrupar por servicio
  const serviceStats = {};
  reservationServices.forEach(rs => {
    const serviceId = rs.service_id;
    if (!serviceStats[serviceId]) {
      serviceStats[serviceId] = {
        serviceId,
        serviceName: rs.services.name,
        timesRequested: 0,
        totalRevenue: 0,
        uniqueReservations: new Set()
      };
    }

    serviceStats[serviceId].timesRequested += rs.quantity;
    serviceStats[serviceId].totalRevenue += rs.subtotal;
    serviceStats[serviceId].uniqueReservations.add(rs.reservation_id);
  });

  // Contar total de reservas en el período
  const totalReservations = await prisma.reservations.count({
    where: {
      check_in_date: { gte: start, lte: end },
      deleted_at: null
    }
  });

  // Convertir a array y calcular métricas
  const servicesArray = Object.values(serviceStats).map(service => {
    const avgPrice = service.timesRequested > 0 
      ? service.totalRevenue / service.timesRequested 
      : 0;
    const percentageOfReservations = totalReservations > 0 
      ? (service.uniqueReservations.size / totalReservations) * 100 
      : 0;

    return {
      serviceId: service.serviceId,
      serviceName: service.serviceName,
      timesRequested: service.timesRequested,
      totalRevenue: Math.round(service.totalRevenue),
      averagePrice: Math.round(avgPrice),
      percentageOfReservations: parseFloat(percentageOfReservations.toFixed(2))
    };
  });

  // Ordenar por ingresos
  servicesArray.sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Agregar ranking
  return servicesArray.map((service, index) => ({
    rank: index + 1,
    ...service
  }));
}

// ============================================
// FASE 4: COMPARACIONES
// ============================================

/**
 * Compara métricas entre dos períodos
 */
async function comparePeriods(period1Start, period1End, period2Start, period2End, metrics) {
  // Calcular KPIs para ambos períodos
  const period1KPIs = await calculateKPIs(period1Start, period1End, false);
  const period2KPIs = await calculateKPIs(period2Start, period2End, false);

  // Calcular cambios
  const calculateChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return parseFloat((((current - previous) / previous) * 100).toFixed(2));
  };

  const changes = {};
  Object.keys(period1KPIs.current).forEach(key => {
    changes[key] = calculateChange(period1KPIs.current[key], period2KPIs.current[key]);
  });

  return {
    period1: {
      label: `${period1Start} a ${period1End}`,
      ...period1KPIs.current
    },
    period2: {
      label: `${period2Start} a ${period2End}`,
      ...period2KPIs.current
    },
    changes
  };
}

/**
 * Compara métricas entre múltiples clientes
 */
async function compareClients(clientIds, startDate, endDate) {
  const comparisons = await Promise.all(
    clientIds.map(async (clientId) => {
      const detail = await getClientDetail(clientId, startDate, endDate);
      if (!detail) return null;

      return {
        userId: detail.client.userId,
        fullName: detail.client.fullName,
        email: detail.client.email,
        totalSpent: detail.client.totalSpent,
        reservations: detail.client.totalReservations,
        averageStay: detail.client.averageStay,
        preferredRoomTypes: detail.client.preferredRoomTypes,
        topServices: detail.servicesUsed.slice(0, 3).map(s => s.serviceName)
      };
    })
  );

  return comparisons.filter(c => c !== null);
}

module.exports = {
  calculateKPIs,
  getOccupancyData,
  getRevenueData,
  getClientsOverview,
  getClientDetail,
  getClientsRevenueTimeline,
  getClientStats,
  getTopClients,
  getTopRooms,
  getTopRoomTypes,
  getTopServices,
  comparePeriods,
  compareClients
};
