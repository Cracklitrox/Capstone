import React, { useState, useRef, useEffect } from 'react';
import { useReportsApi } from '../hooks/useReportsApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Calendar } from '@/components/ui/Calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Checkbox } from '@/components/ui/Checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { 
  FileText, 
  DollarSign, 
  Users, 
  Home, 
  CalendarIcon,
  TrendingUp,
  TrendingDown,
  Download,
  X,
  UserPlus,
  Repeat,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

// Modal de previsualización con gráficos
const ReportModal = ({ isOpen, onClose, data, dateRange, reportType }) => {
  const [selectedCharts, setSelectedCharts] = useState({
    bar: true,
    line: true,
    pie: true,
    area: false,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const previewRef = useRef(null);

  if (!isOpen) return null;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const chartData = data?.revenue?.data?.map((item, index) => ({
    name: item.period || `Período ${index + 1}`,
    ingresos: item.total || 0,
    ocupacion: data?.occupancy?.data?.[index]?.percentage || 0,
    checkIns: data?.checkIns?.data?.[index]?.count || 0,
  })) || [];

  const pieData = [
    { name: 'Habitaciones', value: data?.revenue?.data?.reduce((sum, item) => sum + (item.roomRevenue || 0), 0) || 0 },
    { name: 'Servicios', value: data?.revenue?.data?.reduce((sum, item) => sum + (item.servicesRevenue || 0), 0) || 0 },
  ].filter(item => item.value > 0);

  const handleDownloadPDF = async () => {
    if (!previewRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `Reporte_${reportType}_${formatDate(dateRange.from)}_${formatDate(dateRange.to)}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error al generar PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-lg shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-slate-900">
          <div>
            <h2 className="text-lg font-bold text-white">Previsualización de Reporte</h2>
            <p className="text-xs text-slate-300 mt-1">
              {formatDate(dateRange.from)} - {formatDate(dateRange.to)} • {reportType}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-slate-800">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-56 border-r border-slate-700 bg-slate-900 p-4 space-y-4 overflow-y-auto">
            <div>
              <h3 className="text-sm font-semibold mb-3 text-white">Tipos de Gráficos</h3>
              <div className="space-y-2">
                {Object.entries({ bar: 'Barras', line: 'Líneas', pie: 'Circular', area: 'Área' }).map(([key, label]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`chart-${key}`}
                      checked={selectedCharts[key]}
                      onCheckedChange={() => setSelectedCharts(prev => ({ ...prev, [key]: !prev[key] }))}
                    />
                    <Label htmlFor={`chart-${key}`} className="cursor-pointer text-sm text-slate-300">
                      Gráfico de {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-700">
              <h3 className="text-sm font-semibold mb-2 text-white">Resumen</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400">Ingresos:</span>
                  <p className="font-semibold text-green-400">
                    {formatCurrency(data?.revenue?.total || 0)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Ocupación:</span>
                  <p className="font-semibold text-cyan-400">
                    {data?.occupancy?.average?.toFixed(2) || 0}%
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Períodos con datos:</span>
                  <p className="font-semibold text-white">
                    {data?.revenue?.data?.length || 0} de {data?.revenue?.count || 0}
                  </p>
                </div>
                {(data?.revenue?.total || 0) === 0 && (
                  <div className="mt-2 p-2 bg-yellow-900/50 rounded text-yellow-200">
                    ⚠️ No hay ingresos en este período
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-slate-800">
            <div ref={previewRef} className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-center mb-6 border-b pb-4">
                <h1 className="text-2xl font-bold mb-2 text-blue-600 bg-blue-50 py-2 px-4 rounded inline-block">Reporte {reportType}</h1>
                <p className="text-sm text-slate-700 mt-2">
                  Período: {formatDate(dateRange.from)} - {formatDate(dateRange.to)}
                </p>
              </div>

              <div className="space-y-6">
                {selectedCharts.bar && chartData.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-slate-700">Ingresos por Período</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end" 
                          height={70}
                          tick={{ fontSize: 11 }}
                          stroke="#64748b"
                        />
                        <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                        <Tooltip 
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{ fontSize: '12px', borderRadius: '6px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="ingresos" fill="#10b981" name="Ingresos" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {selectedCharts.line && chartData.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-slate-700">Tendencia de Ocupación y Check-ins</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end" 
                          height={70}
                          tick={{ fontSize: 11 }}
                          stroke="#64748b"
                        />
                        <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#64748b" />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#64748b" />
                        <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '6px' }} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Line 
                          yAxisId="left" 
                          type="monotone" 
                          dataKey="checkIns" 
                          stroke="#f59e0b" 
                          name="Check-ins" 
                          strokeWidth={2}
                          dot={{ fill: '#f59e0b', r: 3 }}
                        />
                        <Line 
                          yAxisId="right" 
                          type="monotone" 
                          dataKey="ocupacion" 
                          stroke="#06b6d4" 
                          name="Ocupación %" 
                          strokeWidth={2}
                          dot={{ fill: '#06b6d4', r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {selectedCharts.pie && pieData.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-slate-700">Distribución de Ingresos</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{ fontSize: '12px', borderRadius: '6px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {selectedCharts.area && chartData.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-slate-700">Tendencia de Ingresos</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end" 
                          height={70}
                          tick={{ fontSize: 11 }}
                          stroke="#64748b"
                        />
                        <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                        <Tooltip 
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{ fontSize: '12px', borderRadius: '6px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Area 
                          type="monotone" 
                          dataKey="ingresos" 
                          stackId="1" 
                          stroke="#10b981" 
                          fill="#10b981" 
                          fillOpacity={0.6} 
                          name="Ingresos" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t bg-slate-900">
          <Button variant="outline" onClick={onClose} className="text-white border-slate-600 hover:bg-slate-800">
            Cancelar
          </Button>
          <Button onClick={handleDownloadPDF} disabled={isGenerating} className="bg-cyan-600 hover:bg-cyan-700">
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Generando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Descargar PDF
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Sección de análisis de clientes
const ClientsSection = ({ topClientsData, clientStats }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const topClients = topClientsData || [];

  const clientSegmentation = clientStats?.segmentation || [];

  const statsData = [
    { title: 'Total Clientes', value: clientStats?.totalClients || 0, icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { title: 'Clientes Nuevos', value: clientStats?.newClients || 0, icon: UserPlus, color: 'text-green-600', bgColor: 'bg-green-100' },
    { title: 'Clientes Recurrentes', value: clientStats?.recurringClients || 0, icon: Repeat, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {statsData.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Clientes por Ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            {topClients.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topClients} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#fff'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="revenue" fill="#10b981" name="Ingresos Totales" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No hay datos de clientes disponibles
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Segmentación de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            {clientSegmentation.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={clientSegmentation}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="percentage"
                  >
                    {clientSegmentation.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `${value}%`}
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No hay datos de segmentación disponibles
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalle de Clientes Destacados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Cliente</th>
                  <th className="text-center p-2">Reservas</th>
                  <th className="text-right p-2">Ingresos Totales</th>
                  <th className="text-right p-2">Promedio por Reserva</th>
                </tr>
              </thead>
              <tbody>
                {topClients.map((client, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{client.name}</td>
                    <td className="text-center p-2">{client.reservations}</td>
                    <td className="text-right p-2">{formatCurrency(client.revenue)}</td>
                    <td className="text-right p-2">
                      {formatCurrency(client.revenue / client.reservations)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const Reports = () => {
  const {
    getDailyRevenue,
    getDailyOccupancy,
    getWeeklyRevenue,
    getWeeklyOccupancy,
    getMonthlyRevenue,
    getMonthlyOccupancy,
    getYearlyRevenue,
    getYearlyOccupancy,
    getTopClients,
    getClientStats,
    getRoomTypeStats,
  } = useReportsApi();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState('');
  const [selectedCharts, setSelectedCharts] = useState({
    bar: true,
    line: true,
    pie: true,
    area: false,
  });
  const [dashboardData, setDashboardData] = useState({
    weeklyRevenue: [],
    occupancyTrend: [],
    roomTypeStats: [],
  });
  const [clientsData, setClientsData] = useState({
    topClients: [],
    stats: null,
  });
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  // Cargar datos del dashboard al montar
  useEffect(() => {
    loadDashboardData();
    loadClientsData();
  }, []);

  const loadDashboardData = async () => {
    setLoadingDashboard(true);
    try {
      // Obtener datos de las últimas 4 semanas
      const endDate = format(new Date(), 'yyyy-MM-dd');
      const startDate = format(new Date(new Date().setDate(new Date().getDate() - 28)), 'yyyy-MM-dd');
      
      // Obtener datos de tipos de habitación del mes actual
      const monthStart = format(new Date(new Date().setDate(1)), 'yyyy-MM-dd');
      
      const [weeklyRev, dailyOcc, roomTypes] = await Promise.all([
        getWeeklyRevenue(startDate, endDate),
        getDailyOccupancy(startDate, endDate),
        getRoomTypeStats(monthStart, endDate),
      ]);

      // Procesar ingresos semanales
      const weeklyRevenueData = weeklyRev?.data?.map((item, index) => ({
        semana: `Sem ${index + 1}`,
        ingresos: item.totalRevenue || 0,
      })) || [];

      // Procesar ocupación diaria (últimos 7 días)
      const last7Days = dailyOcc?.data?.slice(-7).map((item) => {
        const date = new Date(item.period);
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        return {
          dia: dayNames[date.getDay()],
          ocupacion: Math.round(item.occupancyPercentage || 0),
        };
      }) || [];

      // Procesar distribución de tipos de habitación desde el endpoint real
      const roomTypeStatsData = roomTypes?.data?.map((item) => ({
        name: item.roomTypeName || item.name || 'Sin nombre',
        value: item.reservationCount || item.value || 0,
      })) || [];

      setDashboardData({
        weeklyRevenue: weeklyRevenueData,
        occupancyTrend: last7Days,
        roomTypeStats: roomTypeStatsData,
      });
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
      // Establecer datos vacíos en caso de error
      setDashboardData({
        weeklyRevenue: [],
        occupancyTrend: [],
        roomTypeStats: [],
      });
    } finally {
      setLoadingDashboard(false);
    }
  };

  const loadClientsData = async () => {
    try {
      const endDate = format(new Date(), 'yyyy-MM-dd');
      const startDate = format(new Date(new Date().setDate(new Date().getDate() - 90)), 'yyyy-MM-dd');
      
      // Cargar top 5 clientes desde el endpoint real
      const topClientsResponse = await getTopClients(startDate, endDate, 5);
      const topClientsRaw = topClientsResponse?.data || [];
      
      // Transformar formato del backend al formato esperado por el frontend
      const topClients = Array.isArray(topClientsRaw) ? topClientsRaw.map(client => ({
        name: client.fullName || 'Cliente sin nombre',
        reservations: client.reservationCount || 0,
        revenue: client.totalSpent || 0,
      })) : [];

      // Cargar estadísticas de clientes desde el endpoint real
      const statsResponse = await getClientStats(startDate, endDate);
      const statsRaw = statsResponse?.data || {};

      const stats = {
        totalClients: statsRaw.totalClients || 0,
        newClients: statsRaw.newClients || 0,
        recurringClients: statsRaw.recurringClients || 0,
        segmentation: statsRaw.segmentation || [],
      };

      setClientsData({
        topClients,
        stats,
      });
    } catch (error) {
      console.error('Error al cargar datos de clientes:', error);
      // Establecer datos vacíos en caso de error
      setClientsData({
        topClients: [],
        stats: {
          totalClients: 0,
          newClients: 0,
          recurringClients: 0,
          segmentation: [],
        },
      });
    }
  };

  const processReportData = (revenueData, occupancyData) => {
    const revenueArray = revenueData?.data || [];
    const occupancyArray = occupancyData?.data || [];

    const processedRevenue = {
      data: revenueArray.map(item => ({
        date: item.period || item.periodLabel,
        period: item.period,
        total: item.totalRevenue || 0,
        roomRevenue: item.roomRevenue || 0,
        servicesRevenue: item.servicesRevenue || 0,
      })),
      total: revenueArray.reduce((sum, item) => sum + (item.totalRevenue || 0), 0),
      count: revenueArray.reduce((sum, item) => sum + (item.reservationCount || 0), 0),
    };

    const processedOccupancy = {
      data: occupancyArray.map(item => ({
        date: item.period || item.periodLabel,
        period: item.period,
        percentage: item.occupancyPercentage || 0,
        occupiedNights: item.occupiedRoomNights || 0,
        availableNights: item.availableRoomNights || 0,
      })),
      average: occupancyArray.length > 0
        ? occupancyArray.reduce((sum, item) => sum + (item.occupancyPercentage || 0), 0) / occupancyArray.length
        : 0,
    };

    const processedCheckIns = {
      data: revenueArray.map(item => ({
        date: item.period || item.periodLabel,
        period: item.period,
        count: item.reservationCount || 0,
      })),
      total: revenueArray.reduce((sum, item) => sum + (item.reservationCount || 0), 0),
      count: revenueArray.length,
    };

    return {
      revenue: processedRevenue,
      occupancy: processedOccupancy,
      checkIns: processedCheckIns,
    };
  };

  const handleGenerateReport = async (rangeType) => {
    setIsLoading(true);
    setSelectedReportType(rangeType);

    // Calcular el rango de fechas según el tipo de reporte
    const today = new Date();
    let from, to;

    switch (rangeType) {
      case 'Diario':
        // HOY (desde las 00:00 hasta las 23:59)
        from = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        to = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        break;
        
      case 'Semanal':
        // Última semana completa (Lunes pasado al Domingo pasado)
        const currentDay = today.getDay(); // 0 = Domingo, 1 = Lunes, ...
        const daysToLastMonday = currentDay === 0 ? 6 : currentDay - 1; // Si es domingo, 6 días atrás
        const lastMonday = new Date(today);
        lastMonday.setDate(today.getDate() - daysToLastMonday - 7);
        const lastSunday = new Date(lastMonday);
        lastSunday.setDate(lastMonday.getDate() + 6);
        
        from = new Date(lastMonday.getFullYear(), lastMonday.getMonth(), lastMonday.getDate());
        to = new Date(lastSunday.getFullYear(), lastSunday.getMonth(), lastSunday.getDate(), 23, 59, 59);
        break;
        
      case 'Mensual':
        // Mes pasado completo
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        
        from = lastMonth;
        to = new Date(lastDayOfLastMonth.getFullYear(), lastDayOfLastMonth.getMonth(), lastDayOfLastMonth.getDate(), 23, 59, 59);
        break;
        
      case 'Trimestral':
        // Último trimestre completo (3 meses atrás)
        const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
        const endOfLastQuarter = new Date(today.getFullYear(), today.getMonth(), 0);
        
        from = threeMonthsAgo;
        to = new Date(endOfLastQuarter.getFullYear(), endOfLastQuarter.getMonth(), endOfLastQuarter.getDate(), 23, 59, 59);
        break;
        
      case 'Anual':
        // Año pasado completo (1 de enero al 31 de diciembre del año anterior)
        const lastYear = today.getFullYear() - 1;
        from = new Date(lastYear, 0, 1); // 1 de enero
        to = new Date(lastYear, 11, 31, 23, 59, 59); // 31 de diciembre
        break;
        
      default:
        from = dateRange.from;
        to = dateRange.to;
    }

    // Actualizar el estado del rango de fechas
    setDateRange({ from, to });

    const startDate = format(from, 'yyyy-MM-dd');
    const endDate = format(to, 'yyyy-MM-dd');

    console.log('📅 Generando reporte:', {
      tipo: rangeType,
      fechaInicio: startDate,
      fechaFin: endDate,
      dias: Math.ceil((to - from) / (1000 * 60 * 60 * 24)),
      from: from.toLocaleDateString('es-ES'),
      to: to.toLocaleDateString('es-ES')
    });

    try {
      let revenue, occupancy;

      switch (rangeType) {
        case 'Diario':
          [revenue, occupancy] = await Promise.all([
            getDailyRevenue(startDate, endDate),
            getDailyOccupancy(startDate, endDate),
          ]);
          break;
        case 'Semanal':
          [revenue, occupancy] = await Promise.all([
            getWeeklyRevenue(startDate, endDate),
            getWeeklyOccupancy(startDate, endDate),
          ]);
          break;
        case 'Mensual':
          [revenue, occupancy] = await Promise.all([
            getMonthlyRevenue(startDate, endDate),
            getMonthlyOccupancy(startDate, endDate),
          ]);
          break;
        case 'Trimestral':
          [revenue, occupancy] = await Promise.all([
            getMonthlyRevenue(startDate, endDate),
            getMonthlyOccupancy(startDate, endDate),
          ]);
          break;
        case 'Anual':
          [revenue, occupancy] = await Promise.all([
            getYearlyRevenue(startDate, endDate),
            getYearlyOccupancy(startDate, endDate),
          ]);
          break;
        default:
          [revenue, occupancy] = await Promise.all([
            getDailyRevenue(startDate, endDate),
            getDailyOccupancy(startDate, endDate),
          ]);
      }

      console.log('📊 Datos recibidos del backend:', {
        revenue: revenue?.data?.length || 0,
        occupancy: occupancy?.data?.length || 0,
        primerosIngresos: revenue?.data?.slice(0, 3)
      });

      const processed = processReportData(revenue, occupancy);
      
      console.log('✅ Datos procesados:', {
        totalIngresos: processed.revenue.total,
        cantidadPeriodos: processed.revenue.data.length,
        primerosPeriodos: processed.revenue.data.slice(0, 3)
      });
      
      setReportData(processed);
      setIsModalOpen(true);
    } catch (err) {
      console.error('Error al obtener reportes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const setQuickRange = (days) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setDateRange({ from, to });
  };

  const handleGenerateCustomReport = async () => {
    if (!dateRange.from || !dateRange.to) return;
    
    setIsLoading(true);
    setSelectedReportType('Personalizado');

    const startDate = format(dateRange.from, 'yyyy-MM-dd');
    const endDate = format(dateRange.to, 'yyyy-MM-dd');

    try {
      // Calcular días entre fechas para determinar el mejor groupBy
      const days = Math.ceil((dateRange.to - dateRange.from) / (1000 * 60 * 60 * 24));
      
      let revenue, occupancy;
      
      // Seleccionar groupBy según la cantidad de días
      if (days <= 31) {
        // Menos de un mes: usar daily
        [revenue, occupancy] = await Promise.all([
          getDailyRevenue(startDate, endDate),
          getDailyOccupancy(startDate, endDate),
        ]);
      } else if (days <= 90) {
        // 1-3 meses: usar weekly
        [revenue, occupancy] = await Promise.all([
          getWeeklyRevenue(startDate, endDate),
          getWeeklyOccupancy(startDate, endDate),
        ]);
      } else if (days <= 365) {
        // 3-12 meses: usar monthly
        [revenue, occupancy] = await Promise.all([
          getMonthlyRevenue(startDate, endDate),
          getMonthlyOccupancy(startDate, endDate),
        ]);
      } else {
        // Más de un año: usar yearly
        [revenue, occupancy] = await Promise.all([
          getYearlyRevenue(startDate, endDate),
          getYearlyOccupancy(startDate, endDate),
        ]);
      }

      const processed = processReportData(revenue, occupancy);
      setReportData(processed);
      setIsModalOpen(true);
    } catch (err) {
      console.error('Error al obtener reportes personalizados:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Reportes y Estadísticas</h1>
        <p className="text-muted-foreground">
          Visualiza y analiza los datos de tu hotel de forma completa
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-flex">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Clientes</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(4488000)}</div>
                <p className="text-xs text-muted-foreground mt-1">+12.5% vs mes anterior</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ocupación Actual</CardTitle>
                <Home className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">87.3%</div>
                <p className="text-xs text-muted-foreground mt-1">-3.2% vs mes anterior</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Huéspedes</CardTitle>
                <Users className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">156</div>
                <p className="text-xs text-muted-foreground mt-1">+8.7% vs mes anterior</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reservas Activas</CardTitle>
                <FileText className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">41</div>
                <p className="text-xs text-muted-foreground mt-1">+5.1% vs mes anterior</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Generar Reportes Personalizados</CardTitle>
              <p className="text-sm text-muted-foreground">
                Selecciona un rango de fechas y el tipo de reporte que deseas generar
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Fecha de Inicio</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !dateRange.from && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.from ? (
                            format(dateRange.from, 'PPP', { locale: es })
                          ) : (
                            <span>Seleccionar fecha</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRange.from}
                          onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Fecha de Fin</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !dateRange.to && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.to ? (
                            format(dateRange.to, 'PPP', { locale: es })
                          ) : (
                            <span>Seleccionar fecha</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRange.to}
                          onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Rangos Rápidos</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={() => setQuickRange(7)}>
                        7 días
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setQuickRange(30)}>
                        30 días
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setQuickRange(90)}>
                        90 días
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setQuickRange(365)}>
                        1 año
                      </Button>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="mb-3 block">Tipo de Reporte</Label>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                    {['Diario', 'Semanal', 'Mensual', 'Trimestral', 'Anual'].map((type) => (
                      <Button
                        key={type}
                        onClick={() => handleGenerateReport(type)}
                        disabled={isLoading}
                        className="h-auto flex-col gap-2 py-4"
                      >
                        <FileText className="h-5 w-5" />
                        <span>Reporte {type}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="mb-3 block">Incluir Gráficos en el Reporte</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="chart-bar"
                          checked={selectedCharts.bar}
                          onChange={(e) => setSelectedCharts({ ...selectedCharts, bar: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <label htmlFor="chart-bar" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Gráfico de Barras
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="chart-line"
                          checked={selectedCharts.line}
                          onChange={(e) => setSelectedCharts({ ...selectedCharts, line: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <label htmlFor="chart-line" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Gráfico de Líneas
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="chart-pie"
                          checked={selectedCharts.pie}
                          onChange={(e) => setSelectedCharts({ ...selectedCharts, pie: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <label htmlFor="chart-pie" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Gráfico Circular
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="chart-area"
                          checked={selectedCharts.area}
                          onChange={(e) => setSelectedCharts({ ...selectedCharts, area: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <label htmlFor="chart-area" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Gráfico de Área
                        </label>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleGenerateCustomReport}
                    disabled={!dateRange.from || !dateRange.to || isLoading}
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generando...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Generar Reporte Personalizado
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumen General de Ingresos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Últimos 30 días de actividad
              </p>
            </CardHeader>
            <CardContent>
              {loadingDashboard ? (
                <div className="flex items-center justify-center h-[600px]">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <h3 className="text-sm font-semibold mb-3">Ingresos por Semana</h3>
                      {dashboardData.weeklyRevenue.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={dashboardData.weeklyRevenue}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="semana" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                            <Tooltip 
                              formatter={(value) => formatCurrency(value)}
                              contentStyle={{ 
                                backgroundColor: '#1f2937', 
                                border: '1px solid #374151',
                                borderRadius: '6px',
                                color: '#fff'
                              }}
                            />
                            <Bar dataKey="ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                          No hay datos de ingresos disponibles
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold mb-3">Tipos de Habitación más Reservadas</h3>
                      {dashboardData.roomTypeStats.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={dashboardData.roomTypeStats}
                              cx="50%"
                              cy="50%"
                              labelLine={true}
                              label={(entry) => `${entry.name}: ${entry.value}%`}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {dashboardData.roomTypeStats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value) => `${value}%`}
                              contentStyle={{ 
                                backgroundColor: '#1f2937', 
                                border: '1px solid #374151',
                                borderRadius: '6px',
                                color: '#fff'
                              }}
                            />
                            <Legend 
                              wrapperStyle={{ fontSize: '12px' }}
                              verticalAlign="bottom"
                              height={36}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                          No hay datos de tipos de habitación disponibles
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-3">Tendencia de Ocupación (Últimos 7 días)</h3>
                    {dashboardData.occupancyTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={dashboardData.occupancyTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="dia" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                          <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                          <Tooltip 
                            formatter={(value) => `${value}%`}
                            contentStyle={{ 
                              backgroundColor: '#1f2937', 
                              border: '1px solid #374151',
                              borderRadius: '6px',
                              color: '#fff'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="ocupacion" 
                            stroke="#06b6d4" 
                            strokeWidth={3}
                            dot={{ fill: '#06b6d4', r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                        No hay datos de ocupación disponibles
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="mt-6">
          <ClientsSection 
            topClientsData={clientsData.topClients} 
            clientStats={clientsData.stats}
          />
        </TabsContent>
      </Tabs>

      <ReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={reportData}
        dateRange={dateRange}
        reportType={selectedReportType}
      />
    </div>
  );
};

export default Reports;
