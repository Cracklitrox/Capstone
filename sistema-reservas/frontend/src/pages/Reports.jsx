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
import 'jspdf-autotable';
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
    name: item.period || item.periodLabel || `Período ${index + 1}`,
    ingresos: item.total || 0,
    ocupacion: data?.occupancy?.data?.[index]?.percentage || 0,
    checkIns: data?.checkIns?.data?.[index]?.count || 0,
  })) || [];

  console.log('📊 Modal - Data recibida:', {
    reportType,
    chartDataLength: chartData.length,
    revenueTotal: data?.revenue?.total,
    occupancyAverage: data?.occupancy?.average,
    firstDataPoint: chartData[0]
  });

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
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: 12 }} 
                    stroke="#9ca3af"
                    tickFormatter={(value) => value >= 1000000 ? `${(value/1000000).toFixed(1)}M` : value >= 1000 ? `${(value/1000).toFixed(0)}K` : value}
                  />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11 }} stroke="#9ca3af" />
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
          {topClients.length > 0 ? (
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
                    <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-2 font-medium">{client.name}</td>
                      <td className="text-center p-2">{client.reservations}</td>
                      <td className="text-right p-2">{formatCurrency(client.revenue)}</td>
                      <td className="text-right p-2">
                        {formatCurrency(client.reservations > 0 ? client.revenue / client.reservations : 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              No hay datos de clientes disponibles
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Componente de Reportes Personalizados
const CustomReportsSection = () => {
  const {
    getClientCustomReport,
    getRoomCustomReport,
    getRoomTypeCustomReport,
    getTopClientsRevenue,
  } = useReportsApi();

  const [reportType, setReportType] = useState('client'); // 'client', 'room', 'roomType', 'topClients'
  const [selectedEntity, setSelectedEntity] = useState('');
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Listas de ejemplo (en producción deberían venir de la API)
  const [clients, setClients] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);

  useEffect(() => {
    // Cargar listas reales desde la base de datos
    const loadData = async () => {
      try {
        // Cargar clientes que tienen reservas
        const clientsResponse = await fetch('http://localhost:3001/api/v1/guests?limit=100', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        if (clientsResponse.ok) {
          const clientsData = await clientsResponse.json();
          const allGuests = clientsData.data || [];
          // Filtrar solo clientes con reservas
          const clientsWithReservations = allGuests.filter(g => g.totalReservations > 0);
          setClients(clientsWithReservations.map(c => ({
            id: c.id,
            name: c.fullName,
            email: c.email
          })));
        }

        // Cargar habitaciones activas
        const roomsResponse = await fetch('http://localhost:3001/api/v1/rooms?isActive=true', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        if (roomsResponse.ok) {
          const roomsData = await roomsResponse.json();
          setRooms((roomsData.data || []).map(r => ({
            id: r.id,
            roomNumber: r.room_number,
            type: r.room_types?.name || 'N/A'
          })));
        }

        // Cargar tipos de habitación activos
        const typesResponse = await fetch('http://localhost:3001/api/v1/room-types?isActive=true', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        if (typesResponse.ok) {
          const typesData = await typesResponse.json();
          setRoomTypes((typesData.data || []).map(rt => ({
            id: rt.id,
            name: rt.name
          })));
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
        // Usar datos de respaldo si falla
        setClients([]);
        setRooms([]);
        setRoomTypes([]);
      }
    };
    
    loadData();
  }, []);

  const handleGenerateReport = async () => {
    setIsLoading(true);
    const startDate = format(dateRange.from, 'yyyy-MM-dd');
    const endDate = format(dateRange.to, 'yyyy-MM-dd');

    try {
      let data;
      switch (reportType) {
        case 'client':
          if (!selectedEntity) {
            alert('Seleccione un cliente');
            setIsLoading(false);
            return;
          }
          data = await getClientCustomReport(selectedEntity, startDate, endDate);
          break;
        case 'room':
          if (!selectedEntity) {
            alert('Seleccione una habitación');
            setIsLoading(false);
            return;
          }
          data = await getRoomCustomReport(selectedEntity, startDate, endDate);
          break;
        case 'roomType':
          if (!selectedEntity) {
            alert('Seleccione un tipo de habitación');
            setIsLoading(false);
            return;
          }
          data = await getRoomTypeCustomReport(selectedEntity, startDate, endDate);
          break;
        case 'topClients':
          data = await getTopClientsRevenue(startDate, endDate, 50);
          break;
        default:
          break;
      }
      setReportData(data);
    } catch (error) {
      console.error('Error al generar reporte:', error);
      alert('Error al generar el reporte');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportData) return;

    // Crear documento PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;

    // Título
    pdf.setFontSize(20);
    pdf.setTextColor(33, 150, 243);
    pdf.text('Reporte Personalizado', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Período
    pdf.setFontSize(12);
    pdf.setTextColor(100, 100, 100);
    pdf.text(
      `Período: ${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`,
      pageWidth / 2,
      yPosition,
      { align: 'center' }
    );
    yPosition += 15;

    // Contenido según tipo de reporte
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);

    if (reportType === 'client' && reportData.data) {
      const { client, summary, reservations } = reportData.data;
      
      pdf.text(`Cliente: ${client.fullName}`, 20, yPosition);
      yPosition += 7;
      pdf.setFontSize(10);
      pdf.text(`Email: ${client.email}`, 20, yPosition);
      yPosition += 5;
      pdf.text(`Teléfono: ${client.phone || 'N/A'}`, 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.text('Resumen:', 20, yPosition);
      yPosition += 7;
      pdf.setFontSize(10);
      pdf.text(`Total Reservas: ${summary.totalReservations}`, 25, yPosition);
      yPosition += 5;
      pdf.text(`Ingresos Totales: ${formatCurrency(summary.totalRevenue)}`, 25, yPosition);
      yPosition += 5;
      pdf.text(`Noches Totales: ${summary.totalNights}`, 25, yPosition);
      yPosition += 5;
      pdf.text(`Promedio por Reserva: ${formatCurrency(summary.averageReservationValue)}`, 25, yPosition);
      yPosition += 10;

      // Tabla de reservas
      if (reservations && reservations.length > 0) {
        pdf.setFontSize(12);
        pdf.text('Historial de Reservas:', 20, yPosition);
        yPosition += 7;

        pdf.setFontSize(8);
        const tableData = reservations.map(r => [
          format(new Date(r.checkInDate), 'dd/MM/yyyy'),
          format(new Date(r.checkOutDate), 'dd/MM/yyyy'),
          r.nights.toString(),
          formatCurrency(r.totalRevenue)
        ]);

        pdf.autoTable({
          startY: yPosition,
          head: [['Check-in', 'Check-out', 'Noches', 'Total']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [33, 150, 243] },
          margin: { left: 20, right: 20 },
        });
      }
    } else if (reportType === 'room' && reportData.data) {
      const { room, summary, reservations } = reportData.data;
      
      pdf.text(`Habitación: ${room.roomNumber}`, 20, yPosition);
      yPosition += 7;
      pdf.setFontSize(10);
      pdf.text(`Tipo: ${room.roomType}`, 20, yPosition);
      yPosition += 5;
      pdf.text(`Piso: ${room.floor}`, 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.text('Resumen:', 20, yPosition);
      yPosition += 7;
      pdf.setFontSize(10);
      pdf.text(`Total Reservas: ${summary.totalReservations}`, 25, yPosition);
      yPosition += 5;
      pdf.text(`Ingresos Totales: ${formatCurrency(summary.totalRevenue)}`, 25, yPosition);
      yPosition += 5;
      pdf.text(`Ocupación: ${summary.occupancyRate.toFixed(2)}%`, 25, yPosition);
      yPosition += 5;
      pdf.text(`Tarifa Promedio: ${formatCurrency(summary.averageNightlyRate)}`, 25, yPosition);
    } else if (reportType === 'topClients' && reportData.data) {
      const { topClients, totalClients } = reportData.data;
      
      pdf.text(`Total de Clientes: ${totalClients}`, 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.text('Top Clientes por Ingresos:', 20, yPosition);
      yPosition += 7;

      const tableData = topClients.map(c => [
        c.rank.toString(),
        c.fullName,
        c.totalReservations.toString(),
        formatCurrency(c.totalRevenue)
      ]);

      pdf.autoTable({
        startY: yPosition,
        head: [['#', 'Cliente', 'Reservas', 'Ingresos']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
        margin: { left: 20, right: 20 },
      });
    }

    // Descargar PDF
    pdf.save(`reporte-${reportType}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Generador de Reportes Personalizados</CardTitle>
          <p className="text-muted-foreground">Crea reportes detallados por cliente, habitación o ranking</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selector de tipo de reporte */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card 
              className={`cursor-pointer transition-all ${reportType === 'client' ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'}`}
              onClick={() => { setReportType('client'); setSelectedEntity(''); setReportData(null); }}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Users className="h-12 w-12 mb-2 text-blue-600" />
                  <h3 className="font-semibold">Por Cliente</h3>
                  <p className="text-xs text-muted-foreground mt-1">Historial y métricas de un cliente específico</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${reportType === 'room' ? 'ring-2 ring-green-500' : 'hover:shadow-lg'}`}
              onClick={() => { setReportType('room'); setSelectedEntity(''); setReportData(null); }}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Home className="h-12 w-12 mb-2 text-green-600" />
                  <h3 className="font-semibold">Por Habitación</h3>
                  <p className="text-xs text-muted-foreground mt-1">Ocupación e ingresos de una habitación</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${reportType === 'roomType' ? 'ring-2 ring-purple-500' : 'hover:shadow-lg'}`}
              onClick={() => { setReportType('roomType'); setSelectedEntity(''); setReportData(null); }}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Home className="h-12 w-12 mb-2 text-purple-600" />
                  <h3 className="font-semibold">Por Tipo de Habitación</h3>
                  <p className="text-xs text-muted-foreground mt-1">Rendimiento por tipo de habitación</p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${reportType === 'topClients' ? 'ring-2 ring-orange-500' : 'hover:shadow-lg'}`}
              onClick={() => { setReportType('topClients'); setSelectedEntity(''); setReportData(null); }}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <TrendingUp className="h-12 w-12 mb-2 text-orange-600" />
                  <h3 className="font-semibold">Top Clientes</h3>
                  <p className="text-xs text-muted-foreground mt-1">Ranking de clientes por ingresos</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formulario de selección */}
          <div className="grid gap-4 md:grid-cols-2">
            {reportType !== 'topClients' && (
              <div className="space-y-2">
                <Label>
                  {reportType === 'client' && 'Seleccionar Cliente'}
                  {reportType === 'room' && 'Seleccionar Habitación'}
                  {reportType === 'roomType' && 'Seleccionar Tipo de Habitación'}
                </Label>
                <select
                  value={selectedEntity}
                  onChange={(e) => setSelectedEntity(e.target.value)}
                  className="w-full p-2 border rounded-md bg-background"
                >
                  <option value="">-- Seleccione --</option>
                  {reportType === 'client' && clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} - {c.email}</option>
                  ))}
                  {reportType === 'room' && rooms.map(r => (
                    <option key={r.id} value={r.id}>Habitación {r.roomNumber} ({r.type})</option>
                  ))}
                  {reportType === 'roomType' && roomTypes.map(rt => (
                    <option key={rt.id} value={rt.id}>{rt.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Rango de Fechas</Label>
              <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'dd/MM/yyyy')} - {format(dateRange.to, 'dd/MM/yyyy')}
                        </>
                      ) : (
                        format(dateRange.from, 'dd/MM/yyyy')
                      )
                    ) : (
                      <span>Seleccionar fechas</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={dateRange}
                    onSelect={(range) => {
                      if (range) {
                        setDateRange(range);
                      }
                    }}
                    numberOfMonths={2}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3">
            <Button 
              onClick={handleGenerateReport}
              disabled={isLoading || (reportType !== 'topClients' && !selectedEntity)}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Generando...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generar Reporte
                </>
              )}
            </Button>

            {reportData && (
              <Button 
                onClick={handleDownloadPDF}
                variant="outline"
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar PDF
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Visualización de datos del reporte */}
      {reportData && reportData.data && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados del Reporte</CardTitle>
          </CardHeader>
          <CardContent>
            {reportType === 'client' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Cliente: {reportData.data.client.fullName}</h3>
                  <p className="text-sm text-muted-foreground">Email: {reportData.data.client.email}</p>
                  <p className="text-sm text-muted-foreground">Teléfono: {reportData.data.client.phone || 'N/A'}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{reportData.data.summary.totalReservations}</div>
                      <p className="text-xs text-muted-foreground">Total Reservas</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(reportData.data.summary.totalRevenue)}</div>
                      <p className="text-xs text-muted-foreground">Ingresos Totales</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{reportData.data.summary.totalNights}</div>
                      <p className="text-xs text-muted-foreground">Noches Totales</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{formatCurrency(reportData.data.summary.averageReservationValue)}</div>
                      <p className="text-xs text-muted-foreground">Promedio por Reserva</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabla de reservas */}
                {reportData.data.reservations && reportData.data.reservations.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Check-in</th>
                          <th className="text-left p-2">Check-out</th>
                          <th className="text-left p-2">Noches</th>
                          <th className="text-left p-2">Habitaciones</th>
                          <th className="text-right p-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.data.reservations.map((r, idx) => (
                          <tr key={idx} className="border-b hover:bg-muted/50">
                            <td className="p-2">{format(new Date(r.checkInDate), 'dd/MM/yyyy')}</td>
                            <td className="p-2">{format(new Date(r.checkOutDate), 'dd/MM/yyyy')}</td>
                            <td className="p-2">{r.nights}</td>
                            <td className="p-2">
                              {r.rooms.map(room => `${room.roomNumber} (${room.roomType})`).join(', ')}
                            </td>
                            <td className="text-right p-2 font-semibold">{formatCurrency(r.totalRevenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {reportType === 'room' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Habitación: {reportData.data.room.roomNumber}</h3>
                  <p className="text-sm text-muted-foreground">Tipo: {reportData.data.room.roomType}</p>
                  <p className="text-sm text-muted-foreground">Piso: {reportData.data.room.floor}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{reportData.data.summary.totalReservations}</div>
                      <p className="text-xs text-muted-foreground">Total Reservas</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(reportData.data.summary.totalRevenue)}</div>
                      <p className="text-xs text-muted-foreground">Ingresos</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-blue-600">{reportData.data.summary.occupancyRate.toFixed(1)}%</div>
                      <p className="text-xs text-muted-foreground">Ocupación</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{formatCurrency(reportData.data.summary.averageNightlyRate)}</div>
                      <p className="text-xs text-muted-foreground">Tarifa Promedio</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {reportType === 'topClients' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Top {reportData.data.topClients.length} Clientes por Ingresos</h3>
                  <p className="text-sm text-muted-foreground">Total de clientes en el período: {reportData.data.totalClients}</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">#</th>
                        <th className="text-left p-2">Cliente</th>
                        <th className="text-left p-2">Email</th>
                        <th className="text-center p-2">Reservas</th>
                        <th className="text-right p-2">Ingresos Totales</th>
                        <th className="text-right p-2">Promedio/Reserva</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data.topClients.map((client) => (
                        <tr key={client.rank} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-semibold">{client.rank}</td>
                          <td className="p-2">{client.fullName}</td>
                          <td className="p-2 text-muted-foreground">{client.email}</td>
                          <td className="text-center p-2">{client.totalReservations}</td>
                          <td className="text-right p-2 font-semibold text-green-600">{formatCurrency(client.totalRevenue)}</td>
                          <td className="text-right p-2">{formatCurrency(client.averageReservationValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const Reports = () => {
  const {
    getHourlyRevenue,
    getHourlyOccupancy,
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
    getTotalPaidAmount,
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
  const [filterMode, setFilterMode] = useState('calendar'); // 'calendar' o 'rolling'
  const [expandedReportType, setExpandedReportType] = useState(null);
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
    monthlyRevenueTotal: 0,
    totalPaidAmount: 0,
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
      
      // Obtener datos del mes actual completo para el KPI de ingresos (día 1 al último día)
      const today = new Date();
      const monthStart = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd');
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const monthEnd = format(lastDayOfMonth, 'yyyy-MM-dd');
      
      // Calcular últimos 7 días + hoy = 8 días total para el gráfico
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7); // Retroceder 7 días desde hoy
      
      const weekStart = format(sevenDaysAgo, 'yyyy-MM-dd');
      const weekEnd = format(today, 'yyyy-MM-dd');
      
      const [weeklyRev, dailyOcc, roomTypes, monthlyRev, totalPaid] = await Promise.all([
        getWeeklyRevenue(startDate, endDate),
        getDailyOccupancy(weekStart, weekEnd),
        getRoomTypeStats(monthStart, monthEnd),
        getMonthlyRevenue(monthStart, monthEnd),
        getTotalPaidAmount(),
      ]);

      // Procesar ingresos semanales
      const weeklyRevenueData = weeklyRev?.data?.map((item, index) => ({
        semana: `Sem ${index + 1}`,
        ingresos: item.totalRevenue || 0,
      })) || [];

      // Procesar ocupación diaria (últimos 8 días incluyendo hoy)
      // Generar TODOS los días desde sevenDaysAgo hasta today, incluso si no hay datos
      const allDays = [];
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      
      for (let i = 0; i < 8; i++) {
        const currentDate = new Date(sevenDaysAgo);
        currentDate.setDate(sevenDaysAgo.getDate() + i);
        const dayName = dayNames[currentDate.getDay()];
        const dayNumber = currentDate.getDate();
        const periodKey = format(currentDate, 'yyyy-MM-dd');
        
        // Buscar si hay datos para este día
        const dayData = dailyOcc?.data?.find(item => item.period === periodKey);
        
        allDays.push({
          dia: `${dayName} ${dayNumber}`,  // Formato: "Lun 14"
          ocupacion: dayData ? Math.round(dayData.occupancyRate || dayData.occupancyPercentage || 0) : 0,
        });
      }
      
      const last7Days = allDays;

      // Procesar distribución de tipos de habitación desde el endpoint real
      const roomTypeStatsData = roomTypes?.data?.map((item) => ({
        name: item.roomTypeName || item.name || 'Sin nombre',
        value: item.reservationCount || item.value || 0,
      })) || [];

      // Calcular total de ingresos del mes actual
      const monthlyRevenueTotal = monthlyRev?.data?.reduce((sum, item) => sum + (item.totalRevenue || 0), 0) || 0;
      
      // Obtener total de paid_amount
      const totalPaidAmount = totalPaid?.data?.totalPaidAmount || 0;

      setDashboardData({
        weeklyRevenue: weeklyRevenueData,
        occupancyTrend: last7Days,
        roomTypeStats: roomTypeStatsData,
        monthlyRevenueTotal: monthlyRevenueTotal,
        totalPaidAmount: totalPaidAmount,
      });
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
      // Establecer datos vacíos en caso de error
      setDashboardData({
        weeklyRevenue: [],
        occupancyTrend: [],
        roomTypeStats: [],
        monthlyRevenueTotal: 0,
        totalPaidAmount: 0,
      });
    } finally {
      setLoadingDashboard(false);
    }
  };

  const loadClientsData = async () => {
    try {
      // Usar HOY como fecha final para incluir clientes creados hoy
      const today = new Date();
      const endDate = format(today, 'yyyy-MM-dd');
      const startDate = format(new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      
      // Cargar top 5 clientes desde el endpoint real
      const topClientsResponse = await getTopClients(startDate, endDate, 5);
      const topClientsRaw = topClientsResponse?.data?.ranking || [];
      
      // Transformar formato del backend al formato esperado por el frontend
      const topClients = Array.isArray(topClientsRaw) ? topClientsRaw.map(client => ({
        name: client.fullName || 'Cliente sin nombre',
        reservations: client.reservationCount || 0,
        revenue: client.totalSpent || 0,
        email: client.email || '',
        userId: client.userId || 0,
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

  const handleGenerateReport = async (rangeType, mode = filterMode) => {
    setIsLoading(true);
    setSelectedReportType(rangeType);

    // Calcular el rango de fechas según el tipo de reporte y modo
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    let from, to;

    if (mode === 'calendar') {
      // MODO CALENDARIO: Períodos fijos (Lun-Dom, día 1-31, etc.)
      switch (rangeType) {
        case 'Diario':
          // HOY SOLAMENTE (24 horas completas del día actual)
          from = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
          to = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
          break;
          
        case 'Semanal':
          // Semana actual (Lunes a Domingo)
          const currentDay = today.getDay(); // 0 = Domingo, 1 = Lunes, ...
          const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
          const thisMonday = new Date(today);
          thisMonday.setDate(today.getDate() - daysFromMonday);
          const thisSunday = new Date(thisMonday);
          thisSunday.setDate(thisMonday.getDate() + 6);
          
          from = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate(), 0, 0, 0);
          to = new Date(thisSunday.getFullYear(), thisSunday.getMonth(), thisSunday.getDate(), 23, 59, 59);
          break;
          
        case 'Mensual':
          // Mes PASADO completo (día 1 a último día del mes anterior)
          const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          from = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1, 0, 0, 0);
          const lastDayOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
          to = new Date(lastDayOfPrevMonth.getFullYear(), lastDayOfPrevMonth.getMonth(), lastDayOfPrevMonth.getDate(), 23, 59, 59);
          break;
          
        case 'Trimestral':
          // Trimestre actual (Q1: Ene-Mar, Q2: Abr-Jun, Q3: Jul-Sep, Q4: Oct-Dic)
          const currentQuarter = Math.floor(today.getMonth() / 3);
          const quarterStartMonth = currentQuarter * 3;
          from = new Date(today.getFullYear(), quarterStartMonth, 1, 0, 0, 0);
          const quarterEndMonth = quarterStartMonth + 2;
          const lastDayOfQuarter = new Date(today.getFullYear(), quarterEndMonth + 1, 0);
          to = new Date(lastDayOfQuarter.getFullYear(), lastDayOfQuarter.getMonth(), lastDayOfQuarter.getDate(), 23, 59, 59);
          break;
          
        case 'Anual':
          // Año actual completo (1 enero a 31 diciembre)
          from = new Date(today.getFullYear(), 0, 1, 0, 0, 0);
          to = new Date(today.getFullYear(), 11, 31, 23, 59, 59);
          break;
          
        default:
          from = dateRange.from;
          to = dateRange.to;
      }
    } else {
      // MODO ROLLING: Últimos X días/semanas/meses desde ayer
      switch (rangeType) {
        case 'Diario':
          // AYER SOLAMENTE (24 horas de ayer)
          from = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0);
          to = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
          break;
          
        case 'Semanal':
          // Últimos 7 días (desde hace 6 días más ayer = 7 días total)
          // Por ejemplo si hoy es 19, ayer es 18, entonces desde 12 al 18 (7 días)
          const sevenDaysAgo = new Date(yesterday);
          sevenDaysAgo.setDate(yesterday.getDate() - 6); // Restar 6 días a ayer = 7 días total
          from = new Date(sevenDaysAgo.getFullYear(), sevenDaysAgo.getMonth(), sevenDaysAgo.getDate(), 0, 0, 0);
          to = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
          break;
          
        case 'Mensual':
          // Últimos 30 días (desde hace 30 días hasta ayer)
          const thirtyDaysAgo = new Date(yesterday);
          thirtyDaysAgo.setDate(yesterday.getDate() - 29);
          from = new Date(thirtyDaysAgo.getFullYear(), thirtyDaysAgo.getMonth(), thirtyDaysAgo.getDate(), 0, 0, 0);
          to = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
          break;
          
        case 'Trimestral':
          // Últimos 90 días (desde hace 90 días hasta ayer)
          const ninetyDaysAgo = new Date(yesterday);
          ninetyDaysAgo.setDate(yesterday.getDate() - 89);
          from = new Date(ninetyDaysAgo.getFullYear(), ninetyDaysAgo.getMonth(), ninetyDaysAgo.getDate(), 0, 0, 0);
          to = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
          break;
          
        case 'Anual':
          // Últimos 365 días (desde hace 365 días hasta ayer)
          const oneYearAgo = new Date(yesterday);
          oneYearAgo.setDate(yesterday.getDate() - 364);
          from = new Date(oneYearAgo.getFullYear(), oneYearAgo.getMonth(), oneYearAgo.getDate(), 0, 0, 0);
          to = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
          break;
          
        default:
          from = dateRange.from;
          to = dateRange.to;
      }
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
          // Usar groupBy='hour' para mostrar 24 horas
          [revenue, occupancy] = await Promise.all([
            getHourlyRevenue(startDate, endDate),
            getHourlyOccupancy(startDate, endDate),
          ]);
          break;
        case 'Semanal':
          // Usar groupBy='day' para mostrar 7 días
          [revenue, occupancy] = await Promise.all([
            getDailyRevenue(startDate, endDate),
            getDailyOccupancy(startDate, endDate),
          ]);
          break;
        case 'Mensual':
          // Para reporte mensual, mostrar datos agrupados por semanas
          [revenue, occupancy] = await Promise.all([
            getWeeklyRevenue(startDate, endDate),
            getWeeklyOccupancy(startDate, endDate),
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
        case 'Anual (Últimos 12 meses)':
          // Últimos 12 meses: agrupar por mes
          [revenue, occupancy] = await Promise.all([
            getMonthlyRevenue(startDate, endDate),
            getMonthlyOccupancy(startDate, endDate),
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
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Clientes</span>
          </TabsTrigger>
          <TabsTrigger value="custom" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Reportes Personalizados</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
          {/* KPI de Ingresos Totales (Ancho completo) */}
          <Card className="border-green-200 dark:border-green-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-bold">Ingresos Totales Pagados</CardTitle>
              <DollarSign className="h-6 w-6 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600">
                {loadingDashboard ? 'Cargando...' : formatCurrency(
                  dashboardData.totalPaidAmount || 0
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">Total de pagos efectivamente recibidos (solo reservas completadas)</p>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {loadingDashboard ? 'Cargando...' : formatCurrency(
                    dashboardData.monthlyRevenueTotal || 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'dd/MM')} - {format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'dd/MM/yyyy')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ocupación Promedio</CardTitle>
                <Home className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {loadingDashboard ? 'Cargando...' : Math.round(
                    dashboardData.occupancyTrend.length > 0 
                      ? dashboardData.occupancyTrend.reduce((sum, day) => sum + day.ocupacion, 0) / dashboardData.occupancyTrend.length
                      : 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Últimos 7 días + hoy</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
                <Users className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {clientsData.stats?.totalClients || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Últimos 90 días</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tipos de Habitación</CardTitle>
                <FileText className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">7</div>
                <p className="text-xs text-muted-foreground mt-1">Tipos disponibles</p>
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
                          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                          {dateRange.from ? (
                            <span className="truncate">{format(dateRange.from, 'PPP', { locale: es })}</span>
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
                          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                          {dateRange.to ? (
                            <span className="truncate">{format(dateRange.to, 'PPP', { locale: es })}</span>
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
                </div>

                <div>
                  <Label className="mb-3 block">Tipo de Reporte</Label>
                  <div className="space-y-3">
                    {['Diario', 'Semanal', 'Mensual', 'Trimestral', 'Anual'].map((type) => (
                      <div key={type} className="border rounded-lg">
                        <button
                          onClick={() => setExpandedReportType(expandedReportType === type ? null : type)}
                          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-cyan-600" />
                            <span className="font-medium">Reporte {type}</span>
                          </div>
                          <svg
                            className={`h-5 w-5 transition-transform ${expandedReportType === type ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {expandedReportType === type && (
                          <div className="px-4 pb-4 space-y-2 border-t bg-slate-50 dark:bg-slate-900">
                            <div className="pt-3 space-y-2">
                              <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-colors">
                                <input
                                  type="radio"
                                  name={`filter-${type}`}
                                  value="calendar"
                                  checked={filterMode === 'calendar'}
                                  onChange={(e) => setFilterMode(e.target.value)}
                                  className="h-4 w-4 text-cyan-600"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-sm">
                                    {type === 'Diario' && 'Día actual (00:00 - 23:59 hrs)'}
                                    {type === 'Semanal' && 'Semana calendario (Lunes a Domingo)'}
                                    {type === 'Mensual' && 'Mes pasado completo (Día 1 al último día)'}
                                    {type === 'Trimestral' && 'Trimestre actual (3 meses)'}
                                    {type === 'Anual' && 'Año calendario (Enero a Diciembre)'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {type === 'Diario' && `Hoy: ${format(new Date(), 'dd/MM/yyyy')}`}
                                    {type === 'Semanal' && `Lun ${format(new Date(new Date().setDate(new Date().getDate() - (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1))), 'dd/MM')} - Dom ${format(new Date(new Date().setDate(new Date().getDate() - (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1) + 6)), 'dd/MM')}`}
                                    {type === 'Mensual' && `${format(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), 'dd/MM')} - ${format(new Date(new Date().getFullYear(), new Date().getMonth(), 0), 'dd/MM/yyyy')}`}
                                    {type === 'Trimestral' && `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`}
                                    {type === 'Anual' && `01/01/${new Date().getFullYear()} - 31/12/${new Date().getFullYear()}`}
                                  </div>
                                </div>
                              </label>
                              
                              <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-colors">
                                <input
                                  type="radio"
                                  name={`filter-${type}`}
                                  value="rolling"
                                  checked={filterMode === 'rolling'}
                                  onChange={(e) => setFilterMode(e.target.value)}
                                  className="h-4 w-4 text-cyan-600"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-sm">
                                    {type === 'Diario' && 'Día anterior completo (ayer)'}
                                    {type === 'Semanal' && 'Últimos 7 días (desde ayer)'}
                                    {type === 'Mensual' && 'Últimos 30 días (desde ayer)'}
                                    {type === 'Trimestral' && 'Últimos 90 días (desde ayer)'}
                                    {type === 'Anual' && 'Últimos 365 días (desde ayer)'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {type === 'Diario' && `Ayer: ${format(new Date(new Date().setDate(new Date().getDate() - 1)), 'dd/MM/yyyy')}`}
                                    {type === 'Semanal' && `${format(new Date(new Date().setDate(new Date().getDate() - 7)), 'dd/MM')} - ${format(new Date(new Date().setDate(new Date().getDate() - 1)), 'dd/MM/yyyy')}`}
                                    {type === 'Mensual' && `${format(new Date(new Date().setDate(new Date().getDate() - 30)), 'dd/MM')} - ${format(new Date(new Date().setDate(new Date().getDate() - 1)), 'dd/MM/yyyy')}`}
                                    {type === 'Trimestral' && `${format(new Date(new Date().setDate(new Date().getDate() - 90)), 'dd/MM')} - ${format(new Date(new Date().setDate(new Date().getDate() - 1)), 'dd/MM/yyyy')}`}
                                    {type === 'Anual' && `${format(new Date(new Date().setDate(new Date().getDate() - 365)), 'dd/MM/yyyy')} - ${format(new Date(new Date().setDate(new Date().getDate() - 1)), 'dd/MM/yyyy')}`}
                                  </div>
                                </div>
                              </label>
                            </div>
                            
                            <Button
                              onClick={() => handleGenerateReport(type, filterMode)}
                              disabled={isLoading}
                              className="w-full mt-3 bg-cyan-600 hover:bg-cyan-700"
                            >
                              {isLoading ? 'Generando...' : `Generar Reporte ${type}`}
                            </Button>
                          </div>
                        )}
                      </div>
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
              <CardTitle>Ingresos por Semana (Últimas 4 Semanas)</CardTitle>
              <p className="text-sm text-muted-foreground">
                Total de ingresos por semana calendario - Solo reservas completadas
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
                            <YAxis 
                              tick={{ fontSize: 12 }} 
                              stroke="#9ca3af"
                              domain={[0, (dataMax) => Math.ceil(dataMax * 1.1)]}
                              tickFormatter={(value) => value >= 1000000 ? `${(value/1000000).toFixed(1)}M` : value >= 1000 ? `${(value/1000).toFixed(0)}K` : value}
                            />
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
                              labelLine={false}
                              label={(entry) => `${entry.value}`}
                              outerRadius={80}
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
                    <h3 className="text-sm font-semibold mb-3">Tendencia de Ocupación (Últimos 7 días + hoy)</h3>
                    {dashboardData.occupancyTrend.length > 0 ? (
                      <div className="w-full overflow-x-auto">
                        <div className="min-w-[600px]">
                          <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={dashboardData.occupancyTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="dia" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                          <YAxis 
                            tick={{ fontSize: 12 }} 
                            stroke="#9ca3af"
                            domain={[0, 100]}
                            tickFormatter={(value) => `${value}%`}
                          />
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
                            dot={{ fill: '#06b6d4', r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                      </div>
                    </div>
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

        <TabsContent value="custom" className="mt-6">
          <CustomReportsSection />
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
