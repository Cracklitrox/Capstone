import React, { useState } from 'react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { FileSpreadsheet, FileText, DollarSign, Calendar as CalendarIcon, Percent, BedDouble } from 'lucide-react';
import useDashboardAdmin from '../hooks/useDashboardAdmin';
import ReportFilters from '@/components/reports/ReportFilters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { exportToExcel } from '@/lib/excelExport';
import { exportToPDF } from '@/lib/pdfExport';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const Reports = () => {
  const [dateRange, setDateRange] = useState(() => {
    const yesterday = subDays(new Date(), 1);
    return { from: subDays(yesterday, 30), to: yesterday };
  });
  const [filterValues, setFilterValues] = useState({ quickPeriod: '30days' });
  const [selectedMetrics, setSelectedMetrics] = useState(['occupancyRate', 'totalRevenue', 'totalReservations']);

  const startDate = format(dateRange.from, 'yyyy-MM-dd');
  const endDate = format(dateRange.to, 'yyyy-MM-dd');

  const { data, loading, error } = useDashboardAdmin(startDate, endDate);

  const handleDateRangeChange = (range) => {
    const yesterday = subDays(new Date(), 1);
    setDateRange({ ...range, to: range.to > yesterday ? yesterday : range.to });
  };

  const handleFilterChange = (filterName, value) => {
    setFilterValues(prev => ({ ...prev, [filterName]: value }));
  };

  const handleExportExcel = async () => {
    if (!data) return;
    await exportToExcel({
      fileName: 'reporte_completo',
      kpis: data.kpis?.current || {},
      data: data.revenue || [],
      dateRange
    });
  };

  const handleExportPDF = async () => {
    if (!data) return;
    await exportToPDF({
      fileName: 'reporte_completo',
      title: 'Reporte Completo',
      kpis: { ...data.kpis?.current, trends: data.kpis?.trends },
      topData: data.topRoomTypes?.slice(0, 10) || [],
      dateRange
    });
  };

  const MetricCard = ({ title, value, icon: Icon, color = 'green' }) => {
    const colorClasses = { blue: 'bg-green-500', green: 'bg-green-500', yellow: 'bg-yellow-500', purple: 'bg-purple-500' };
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground uppercase truncate">{title}</p>
              <p className="mt-2 text-2xl font-bold text-foreground truncate">{value}</p>
            </div>
            <div className={`${colorClasses[color]} p-3 rounded-full flex-shrink-0`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Cargando reportes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-800 dark:text-red-300 font-semibold">Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-3xl">Reportes y Estadísticas</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Análisis completo del rendimiento del hotel</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleExportExcel} variant="outline" size="sm">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <Button onClick={handleExportPDF} variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ReportFilters
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            visibleFilters={['quickPeriod', 'dateRange']}
            filterValues={filterValues}
            onFilterChange={handleFilterChange}
          />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="ocupacion">Ocupación</TabsTrigger>
          <TabsTrigger value="personalizados">Personalizados</TabsTrigger>
        </TabsList>

        {/* TAB 1: GENERAL */}
        <TabsContent value="general" className="space-y-6">
          {/* KPIs */}
          {data?.kpis && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Indicadores Principales</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard title="Ocupación" value={`${Math.round(data.kpis.current.occupancyRate || 0)}%`} icon={Percent} color="green" />
                <MetricCard title="Ingresos Totales" value={`$${Math.round(data.kpis.current.totalRevenue || 0).toLocaleString('es-CL')}`} icon={DollarSign} color="green" />
                <MetricCard title="Total Reservas" value={data.kpis.current.totalReservations} icon={CalendarIcon} color="yellow" />
                <MetricCard title="Habitación Más Usada" value={data.topRoomTypes?.[0]?.roomTypeName || 'N/A'} icon={BedDouble} color="purple" />
              </div>
            </div>
          )}

          {/* Gráfico de Ingresos */}
          {data?.revenue && data.revenue.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tendencia de Ingresos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={data.revenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                    <XAxis dataKey="periodLabel" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none', borderRadius: '8px' }} />
                    <Legend />
                    <Line type="monotone" dataKey="totalRevenue" stroke="#3b82f6" strokeWidth={3} name="Total" />
                    <Line type="monotone" dataKey="roomRevenue" stroke="#10b981" strokeWidth={2} name="Habitaciones" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Top Room Types */}
          {data?.topRoomTypes && data.topRoomTypes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Ingresos por Tipo de Habitación</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={data.topRoomTypes.filter(rt => rt.totalRevenue > 0)} dataKey="totalRevenue" nameKey="roomTypeName" cx="50%" cy="50%" outerRadius={100} label>
                      {data.topRoomTypes.filter(rt => rt.totalRevenue > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 2: OCUPACIÓN */}
        <TabsContent value="ocupacion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ocupación Diaria - Período Seleccionado</CardTitle>
              <p className="text-sm text-muted-foreground">
                {format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - {format(dateRange.to, 'dd/MM/yyyy', { locale: es })}
              </p>
            </CardHeader>
            <CardContent>
              {data?.occupancy && data.occupancy.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={data.occupancy}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                    <XAxis dataKey="periodLabel" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none', borderRadius: '8px' }} />
                    <Bar dataKey="occupancyPercentage" fill="#3b82f6" name="Ocupación %" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-2">No hay datos de ocupación para el período seleccionado</p>
                  <p className="text-sm text-muted-foreground">Intenta seleccionar un rango de fechas diferente</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estadísticas Resumen de Ocupación */}
          {data?.kpis && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Ocupación Promedio</p>
                  <p className="text-3xl font-bold mt-2">{Math.round(data.kpis.current.occupancyRate || 0)}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total Noches Ocupadas</p>
                  <p className="text-3xl font-bold mt-2">{data.kpis.current.totalNights || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">RevPAR</p>
                  <p className="text-3xl font-bold mt-2">${Math.round(data.kpis.current.revPAR || 0).toLocaleString('es-CL')}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* TAB 3: PERSONALIZADOS */}
        <TabsContent value="personalizados" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Constructor de Reportes Personalizados</CardTitle>
              <p className="text-sm text-muted-foreground">
                Selecciona las métricas para el período: {format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - {format(dateRange.to, 'dd/MM/yyyy', { locale: es })}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selector de Métricas */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Métricas Disponibles</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { key: 'occupancyRate', label: 'Tasa de Ocupación' },
                    { key: 'totalRevenue', label: 'Ingresos Totales' },
                    { key: 'totalReservations', label: 'Total Reservas' },
                    { key: 'revPAR', label: 'RevPAR' },
                    { key: 'adr', label: 'ADR' },
                    { key: 'averageStayDuration', label: 'Estadía Promedio' },
                    { key: 'totalClients', label: 'Total Clientes' },
                    { key: 'cancellationRate', label: 'Tasa Cancelación' }
                  ].map(metric => (
                    <label key={metric.key} className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-accent">
                      <input
                        type="checkbox"
                        checked={selectedMetrics.includes(metric.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMetrics([...selectedMetrics, metric.key]);
                          } else {
                            setSelectedMetrics(selectedMetrics.filter(m => m !== metric.key));
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{metric.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Vista Previa del Reporte */}
              {data?.kpis && selectedMetrics.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Vista Previa del Reporte</h3>
                    <div className="flex gap-2">
                      <Button
                        onClick={async () => {
                          const customKPIs = {};
                          selectedMetrics.forEach(key => {
                            customKPIs[key] = data.kpis.current[key];
                          });
                          await exportToExcel({
                            fileName: 'reporte_personalizado',
                            kpis: customKPIs,
                            data: [],
                            dateRange
                          });
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Exportar
                      </Button>
                      <Button
                        onClick={async () => {
                          const customKPIs = {};
                          selectedMetrics.forEach(key => {
                            customKPIs[key] = data.kpis.current[key];
                          });
                          await exportToPDF({
                            fileName: 'reporte_personalizado',
                            title: 'Reporte Personalizado',
                            kpis: customKPIs,
                            dateRange
                          });
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                    {selectedMetrics.map(key => {
                      const value = data.kpis.current[key];
                      const labels = {
                        occupancyRate: 'Ocupación',
                        totalRevenue: 'Ingresos',
                        totalReservations: 'Reservas',
                        revPAR: 'RevPAR',
                        adr: 'ADR',
                        averageStayDuration: 'Estadía Prom.',
                        totalClients: 'Clientes',
                        cancellationRate: 'Cancelaciones'
                      };
                      const formatValue = (k, v) => {
                        if (k.includes('Rate')) return `${Math.round(v)}%`;
                        if (k.includes('Revenue') || k === 'revPAR' || k === 'adr') return `$${Math.round(v).toLocaleString('es-CL')}`;
                        if (k === 'averageStayDuration') return `${v} días`;
                        return v;
                      };

                      return (
                        <div key={key} className="p-3 bg-background rounded border">
                          <p className="text-xs text-muted-foreground">{labels[key]}</p>
                          <p className="text-xl font-bold mt-1">{formatValue(key, value)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedMetrics.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Selecciona al menos una métrica para generar tu reporte personalizado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
