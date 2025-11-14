import React, { useState, useEffect } from 'react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Percent,
  BedDouble,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import useDashboardAdmin from '../hooks/useDashboardAdmin';
import ReportFilters from '../components/ReportFilters';

const DashboardAdmin = () => {
  // Estado para fechas (últimos 30 días por defecto - hasta AYER, no hoy)
  const [dateRange, setDateRange] = useState(() => {
    const yesterday = subDays(new Date(), 1);
    return {
      from: subDays(yesterday, 29), // 29 días atrás + ayer = 30 días totales
      to: yesterday
    };
  });

  // Estado para filtros
  const [topClientsLimit, setTopClientsLimit] = useState(5);
  const [currentClientPage, setCurrentClientPage] = useState(0);
  const [filterValues, setFilterValues] = useState({
    quickPeriod: '30days'
  });

  const startDate = format(dateRange.from, 'yyyy-MM-dd');
  const endDate = format(dateRange.to, 'yyyy-MM-dd');

  // Fechas fijas para métricas adicionales (últimos 30 días siempre)
  const fixedStartDate = format(subDays(subDays(new Date(), 1), 30), 'yyyy-MM-dd');
  const fixedEndDate = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  // Hook para datos FILTRADOS (KPIs, Revenue, Occupancy, Room Types)
  const { data, loading, error, lastUpdate } = useDashboardAdmin(startDate, endDate);
  
  // Hook para datos FIJOS solo para métricas adicionales (últimos 30 días siempre)
  const { data: fixedDataResult, loading: fixedLoading } = useDashboardAdmin(fixedStartDate, fixedEndDate);

  // Estado para datos fijos
  const [fixedData, setFixedData] = useState(null);

  // Guardar datos fijos en estado al cargar por primera vez
  useEffect(() => {
    if (fixedDataResult && !fixedLoading) {
      setFixedData(fixedDataResult);
    }
  }, [fixedDataResult, fixedLoading]);

  // Colores para gráficos (verde esmeralda como tema principal)
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

  // ============================================
  // HANDLERS
  // ============================================

  const handleDateRangeChange = (range) => {
    // Asegurar que la fecha "to" no sea mayor que ayer
    const yesterday = subDays(new Date(), 1);
    const adjustedRange = {
      ...range,
      to: range.to > yesterday ? yesterday : range.to
    };
    setDateRange(adjustedRange);
  };

  const handleFilterChange = (filterName, value) => {
    setFilterValues(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  // ============================================
  // COMPONENTES AUXILIARES
  // ============================================

  const MetricCard = ({ title, value, icon: Icon, color = 'green' }) => {
    const colorClasses = {
      blue: 'bg-green-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      purple: 'bg-purple-500',
      red: 'bg-red-500',
    };

    return (
      <div className="bg-card rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow border">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="mt-2 text-2xl sm:text-3xl font-bold text-foreground">{value}</p>
          </div>
          <div className={`${colorClasses[color]} p-3 sm:p-4 rounded-full flex-shrink-0 ml-2`}>
            <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
        </div>
      </div>
    );
  };

  const QuickIndicator = ({ label, value, color = 'green' }) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className={`text-lg font-bold text-${color}-600 dark:text-${color}-400`}>{value}</span>
    </div>
  );

  // ============================================
  // RENDERIZADO PRINCIPAL
  // ============================================

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <p className="text-red-800 dark:text-red-300 font-semibold mb-2">Error al cargar los datos</p>
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* ENCABEZADO */}
        <div className="bg-card rounded-lg shadow-md p-4 sm:p-6 border">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard Administrativo</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Vista ejecutiva del rendimiento del hotel
                </p>
              </div>
            </div>
            {/* SELECTOR DE FECHAS */}
            <ReportFilters 
              dateRange={dateRange}
              onDateRangeChange={handleDateRangeChange}
              visibleFilters={['quickPeriod', 'dateRange']}
              filterValues={filterValues}
              onFilterChange={handleFilterChange}
            />
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL - RESUMEN GENERAL */}
        <div className="space-y-4 sm:space-y-6">

        {/* MÉTRICAS PRINCIPALES */}
        {data.kpis && (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">
              Indicadores Principales
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              <MetricCard
                title="Habitaciones Ocupadas"
                value={data.kpis.current.occupiedRoomsCount || 0}
                icon={Percent}
                color="green"
              />
              <MetricCard
                title="Ingresos Totales"
                value={`$${Math.round(data.kpis.current.totalRevenue || 0).toLocaleString('es-CL')}`}
                icon={DollarSign}
                color="green"
              />
              <MetricCard
                title="Habitación Más Usada"
                value={data.topRoomTypes && data.topRoomTypes.length > 0 ? data.topRoomTypes[0].roomTypeName : 'N/A'}
                icon={BedDouble}
                color="purple"
              />
              <MetricCard
                title="Total Reservas"
                value={data.kpis.current.totalReservations}
                icon={Calendar}
                color="yellow"
              />
            </div>

            {/* MÉTRICAS ADICIONALES DE VALOR - USAN DATOS FIJOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mt-4">
              <div className="bg-card rounded-lg shadow-md p-4 border-l-4 border-green-500">
                <p className="text-xs font-medium text-muted-foreground uppercase">Ingreso por Reserva</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  ${Math.round((fixedData?.kpis?.current?.totalRevenue || 0) / (fixedData?.kpis?.current?.totalReservations || 1)).toLocaleString('es-CL')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Promedio de ingresos generados por cada reserva completada</p>
              </div>
              
              <div className="bg-card rounded-lg shadow-md p-4 border-l-4 border-green-500">
                <p className="text-xs font-medium text-muted-foreground uppercase">Estadía Promedio</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {Math.round(fixedData?.kpis?.current?.averageStayDuration || 0)} días
                </p>
                <p className="text-xs text-muted-foreground mt-1">Duración promedio de las reservas completadas</p>
              </div>
              
              <div className="bg-card rounded-lg shadow-md p-4 border-l-4 border-purple-500">
                <p className="text-xs font-medium text-muted-foreground uppercase">Total Clientes</p>
                <p className="text-2xl font-bold text-foreground mt-1">{fixedData?.kpis?.current?.totalClients || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Clientes únicos que realizaron reservas</p>
              </div>
              
              <div className="bg-card rounded-lg shadow-md p-4 border-l-4 border-orange-500">
                <p className="text-xs font-medium text-muted-foreground uppercase">Total Huéspedes</p>
                <p className="text-2xl font-bold text-foreground mt-1">{fixedData?.kpis?.current?.totalGuests || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Personas hospedadas en el período</p>
              </div>
            </div>
          </div>
        )}

        {/* GRÁFICO DE TENDENCIA DE INGRESOS */}
        {data.revenue && data.revenue.length > 0 && (
          <div className="bg-card rounded-lg shadow-md p-4 sm:p-6 border">
            <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4">
              Tendencia de Ingresos (Semanal)
            </h2>
            <div className="w-full overflow-x-auto">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={data.revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                  <XAxis 
                    dataKey="periodLabel" 
                    tick={{ fontSize: 11, fill: '#9ca3af' }} 
                    angle={-45} 
                    textAnchor="end" 
                    height={80} 
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#9ca3af' }} 
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value, name) => {
                      if (name === 'totalRevenue') return [`$${value.toLocaleString('es-CL')}`, 'Total'];
                      if (name === 'roomRevenue') return [`$${value.toLocaleString('es-CL')}`, 'Habitaciones'];
                      if (name === 'servicesRevenue') return [`$${value.toLocaleString('es-CL')}`, 'Servicios'];
                      return [value, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="totalRevenue" stroke="#3b82f6" strokeWidth={3} name="Total" />
                  <Line type="monotone" dataKey="roomRevenue" stroke="#10b981" strokeWidth={2} name="Habitaciones" />
                  <Line type="monotone" dataKey="servicesRevenue" stroke="#f59e0b" strokeWidth={2} name="Servicios" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* GRID: OCUPACIÓN + TOP CLIENTES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* COLUMNA IZQUIERDA: OCUPACIÓN + RESUMEN */}
          <div className="space-y-4 sm:space-y-6">
            {/* GRÁFICO DE OCUPACIÓN */}
            {data.occupancy && data.occupancy.length > 0 && (
              <div className="bg-card rounded-lg shadow-md p-4 sm:p-6 border">
                <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4">
                  Ocupación Diaria (Últimos 14 días)
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.occupancy.slice(-14)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                    <XAxis 
                      dataKey="periodLabel" 
                      tick={{ fontSize: 11, fill: '#9ca3af' }} 
                      angle={-45} 
                      textAnchor="end" 
                      height={70} 
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: '#9ca3af' }} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                        border: 'none', 
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value) => Math.round(value)} 
                    />
                    <Bar dataKey="occupancyPercentage" fill="#3b82f6" name="Ocupación" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* SERVICIOS ADICIONALES - TODOS (incluso los no contratados) */}
            {data.topServices && data.topServices.length > 0 && (
              <div className="bg-card rounded-lg shadow-md p-4 sm:p-6 border">
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4">
                  Servicios Adicionales Disponibles
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({data.topServices.length} servicios)
                  </span>
                </h3>
                <div className="space-y-3">
                  {data.topServices.map((service, index) => {
                      // Asignar íconos según el NOMBRE del servicio (no por posición)
                      const iconMap = {
                        'Desayuno': '🍽️',
                        'Lavandería': '🧺',
                        'Transfer': '🚗',
                        'Spa': '🧖',
                        'Piscina': '🏊',
                        'Masajes': '💆',
                        'Tenis': '🎾',
                        'Bar': '🍷',
                        'Teatro': '🎭',
                        'Música': '🎵',
                        'Bicicletas': '🚴',
                        'Golf': '⛳',
                        'Eventos': '🎪',
                        'Cine': '🎬',
                        'Gimnasio': '🏋️',
                      };
                      const icon = iconMap[service.serviceName] || '⭐';
                      
                      // Determinar si fue usado o no
                      const wasUsed = service.totalRevenue > 0;
                      const colorClass = wasUsed 
                        ? 'bg-green-500/10 border-green-500/30' 
                        : 'bg-secondary/20 border-border/50';
                      
                      return (
                        <div 
                          key={service.serviceId} 
                          className={`${colorClass} p-3 sm:p-4 rounded-lg border hover:scale-[1.01] transition-all`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            {/* Icono + Info */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span className="text-2xl flex-shrink-0">{icon}</span>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-foreground truncate">
                                  {service.serviceName}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                                  {wasUsed ? (
                                    <>
                                      <span className="font-semibold text-green-600 dark:text-green-400">
                                        {service.timesRequested} {service.timesRequested === 1 ? 'vez contratado' : 'veces contratado'}
                                      </span>
                                      <span>•</span>
                                      <span>
                                        {service.percentageOfReservations.toFixed(0)}% de reservas
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground italic">
                                      No contratado en este período
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Ingresos */}
                            <div className="text-right flex-shrink-0">
                              <p className={`text-lg sm:text-xl font-bold ${
                                wasUsed 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : 'text-muted-foreground'
                              }`}>
                                {wasUsed 
                                  ? `$${Math.round(service.totalRevenue).toLocaleString('es-CL')}` 
                                  : '$0'
                                }
                              </p>
                              {wasUsed && service.timesRequested > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  ${Math.round(service.totalRevenue / service.timesRequested).toLocaleString('es-CL')} c/u
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Barra de progreso solo para servicios usados */}
                          {wasUsed && (
                            <div className="w-full bg-secondary/30 rounded-full h-1.5 mt-3">
                              <div 
                                className="h-1.5 rounded-full bg-green-500 transition-all"
                                style={{ 
                                  width: `${Math.min((service.totalRevenue / Math.max(...data.topServices.map(s => s.totalRevenue))) * 100, 100)}%` 
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA: TOP CLIENTES CON CARRUSEL */}
          {fixedData?.topClients && fixedData.topClients.ranking.length > 0 && (
            <div className="bg-card rounded-lg shadow-md p-4 sm:p-6 border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                <h2 className="text-lg sm:text-xl font-bold text-foreground">
                  Top 5 Clientes
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    (Últimos 30 días)
                  </span>
                </h2>
                {fixedData.topClients.ranking.length > 5 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentClientPage(Math.max(0, currentClientPage - 1))}
                      disabled={currentClientPage === 0}
                      className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Anteriores"
                    >
                      <ChevronLeft className="w-5 h-5 text-foreground" />
                    </button>
                    <span className="text-sm text-muted-foreground">
                      {currentClientPage + 1} / {Math.ceil(fixedData.topClients.ranking.length / 5)}
                    </span>
                    <button
                      onClick={() => setCurrentClientPage(Math.min(Math.ceil(fixedData.topClients.ranking.length / 5) - 1, currentClientPage + 1))}
                      disabled={currentClientPage >= Math.ceil(fixedData.topClients.ranking.length / 5) - 1}
                      className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Siguientes"
                    >
                      <ChevronRight className="w-5 h-5 text-foreground" />
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-3 sm:space-y-4">
                {fixedData.topClients.ranking
                  .slice(currentClientPage * 5, currentClientPage * 5 + 5)
                  .map((client) => (
                  <div key={client.userId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-secondary/20 rounded-lg hover:bg-secondary/40 transition-colors gap-3 border border-border/50">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {client.rank}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate">{client.fullName}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{client.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">{client.reservationCount} reservas</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <p className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">${client.value.toLocaleString('es-CL')}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(client.lastReservation), 'dd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* DISTRIBUCIÓN POR TIPO DE HABITACIÓN */}
        {data.topRoomTypes && data.topRoomTypes.length > 0 && (
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">
              Ingresos por Tipo de Habitación
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* GRÁFICO DE BARRAS CON MONTOS - TODOS LOS TIPOS */}
              <div className="bg-card rounded-lg shadow-md p-4 sm:p-6 border">
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4">Comparativa de Ingresos</h3>
                <div className="overflow-x-auto">
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={data.topRoomTypes} layout="vertical" margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <YAxis dataKey="roomTypeName" type="category" width={100} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                      <Tooltip 
                        formatter={(value) => [`$${value.toLocaleString('es-CL')}`, 'Ingresos']}
                        labelStyle={{ fontSize: 12 }}
                        contentStyle={{
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Bar dataKey="totalRevenue" fill="#3b82f6" name="Ingresos Generados" radius={[0, 4, 4, 0]}>
                        {data.topRoomTypes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        <LabelList 
                          dataKey="totalRevenue" 
                          position="right" 
                          formatter={(value) => value > 0 ? `$${Math.round(value).toLocaleString('es-CL')}` : '$0'} 
                          style={{ fontSize: 11, fill: '#9ca3af' }} 
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* TABLA DE RANKING DETALLADA */}
              <div className="bg-card rounded-lg shadow-md p-4 sm:p-6 border">
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4">Detalle por Tipo</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/30">
                      <tr>
                        <th className="px-2 sm:px-3 py-2 text-left font-semibold text-foreground">#</th>
                        <th className="px-2 sm:px-3 py-2 text-left font-semibold text-foreground">Tipo</th>
                        <th className="px-2 sm:px-3 py-2 text-right font-semibold text-foreground">Ingresos</th>
                        <th className="px-2 sm:px-3 py-2 text-center font-semibold text-foreground">Reservas</th>
                        <th className="px-2 sm:px-3 py-2 text-center font-semibold text-foreground">Noches</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topRoomTypes.map((rt, index) => (
                        <tr key={rt.roomTypeId} className={index % 2 === 0 ? 'bg-card' : 'bg-secondary/10'}>
                          <td className="px-2 sm:px-3 py-2 font-bold text-muted-foreground">{rt.rank}</td>
                          <td className="px-2 sm:px-3 py-2 font-medium text-foreground truncate max-w-[100px]">{rt.roomTypeName}</td>
                          <td className="px-2 sm:px-3 py-2 text-right font-semibold text-green-600 dark:text-green-400">
                            ${Math.round(rt.totalRevenue).toLocaleString('es-CL')}
                          </td>
                          <td className="px-2 sm:px-3 py-2 text-center text-foreground">{rt.reservationCount}</td>
                          <td className="px-2 sm:px-3 py-2 text-center text-foreground">{rt.totalNights}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default DashboardAdmin;
