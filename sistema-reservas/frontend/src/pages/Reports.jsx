import React, { useState, useRef, useEffect } from 'react';
import { useReportsApi } from '../hooks/useReportsApi';
import socketService from '../services/socketService';
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
  BarChart3,
  FileSpreadsheet,
  Building2,
  ArrowLeftRight,
  Clock,
  AlertCircle,
  CheckCircle,
  Globe
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { fetchAdminRoomTypes } from '../services/adminRooms';
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

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#a855f7'];

// Función auxiliar para exportar datos a Excel (.xlsx)
const exportToExcel = (data, filename) => {
  try {
    if (!data || data.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    // Crear worksheet desde los datos
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Crear workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');
    
    // Generar archivo Excel y descargarlo
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  } catch (error) {
    console.error('Error al exportar a Excel:', error);
    alert('Error al exportar el archivo');
  }
};

// Componente para botón de descarga (PDF y Excel)
const DownloadButton = ({ onDownloadPDF, onDownloadExcel, className = "" }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <Button
        onClick={() => setShowMenu(!showMenu)}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        Descargar
      </Button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-background border border-border rounded-md shadow-lg z-10">
          <button
            onClick={() => {
              onDownloadPDF?.();
              setShowMenu(false);
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent rounded-t-md"
          >
            <FileText className="h-4 w-4 text-red-500" />
            Descargar PDF
          </button>
          <button
            onClick={() => {
              onDownloadExcel?.();
              setShowMenu(false);
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent rounded-b-md"
          >
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            Descargar Excel
          </button>
        </div>
      )}
    </div>
  );
};

// Modal de previsualización con gráficos
const ReportModal = ({ isOpen, onClose, data, dateRange, reportType, selectedChartsFromParent }) => {
  const [selectedCharts, setSelectedCharts] = useState(selectedChartsFromParent || {
    bar: true,
    pie: true,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const previewRef = useRef(null);

  // Sincronizar con el estado del padre cuando cambie
  useEffect(() => {
    if (selectedChartsFromParent) {
      setSelectedCharts(selectedChartsFromParent);
    }
  }, [selectedChartsFromParent]);

  if (!isOpen) return null;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date) => {
    return format(new Date(date), "d 'de' MMM yyyy", { locale: es });
  };

  const chartData = data?.revenue?.data?.map((item, index) => ({
    name: item.period || item.periodLabel || `Período ${index + 1}`,
    ingresos: item.total || 0,
    ocupacion: data?.occupancy?.data?.[index]?.percentage || 0,
    checkIns: data?.checkIns?.data?.[index]?.count || 0,
  })) || [];

  // Si es reporte Diario y no hay datos, generar 24 horas vacías
  let finalChartData = chartData;
  if (reportType === 'Diario' && chartData.length === 0) {
    finalChartData = Array.from({ length: 24 }, (_, i) => ({
      name: `${i.toString().padStart(2, '0')}:00`,
      ingresos: 0,
      ocupacion: 0,
      checkIns: 0,
    }));
  }

  console.log('📊 Modal - Data recibida:', {
    reportType,
    chartDataLength: finalChartData.length,
    revenueTotal: data?.revenue?.total,
    occupancyAverage: data?.occupancy?.average,
    firstDataPoint: finalChartData[0]
  });

  const pieData = [
    { name: 'Habitaciones', value: data?.revenue?.data?.reduce((sum, item) => sum + (item.roomRevenue || 0), 0) || 0 },
    { name: 'Servicios', value: data?.revenue?.data?.reduce((sum, item) => sum + (item.servicesRevenue || 0), 0) || 0 },
  ].filter(item => item.value > 0);

  const handleDownload = async (type = 'pdf') => {
    if (!previewRef.current) return;
    setIsGenerating(true);
    try {
      if (type === 'pdf') {
        // Capturar el contenido completo
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });
        
        // Capturar el contenido completo incluyendo los gráficos
        const content = previewRef.current;
        const canvas = await html2canvas(content, {
          scale: 2,
          logging: false,
          useCORS: true,
          backgroundColor: '#ffffff',
        });

        let yPosition = 20;

        // Título y encabezado
        pdf.setFontSize(20);
        pdf.setTextColor(66, 133, 244);
        pdf.text(`Reporte ${reportType}`, 105, yPosition, { align: 'center' });
        yPosition += 10;

        pdf.setFontSize(12);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Período: ${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`, 105, yPosition, { align: 'center' });
        yPosition += 15;

        // Resumen de datos
        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Resumen', 20, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.text(`Ingresos Totales: ${formatCurrency(data?.revenue?.total || 0)}`, 25, yPosition);
        yPosition += 5;
        const ocupadas = data?.occupancy?.data?.reduce((sum, d) => sum + (d.occupiedNights || 0), 0) || 0;
        const disponibles = data?.occupancy?.data?.reduce((sum, d) => sum + (d.availableNights || 0), 0) || 0;
        pdf.text(`Ocupación de Habitaciones: ${ocupadas} de ${disponibles} habitaciones`, 25, yPosition);
        pdf.text(`Período: ${format(dateRange.from, "d 'de' MMM yyyy")} al ${format(dateRange.to, "d 'de' MMM yyyy")}`, 25, yPosition + 5);
        yPosition += 5;
        pdf.text(`Habitaciones Disponibles: ${data?.occupancy?.data?.reduce((sum, d) => sum + (d.availableNights || 0), 0)}`, 25, yPosition);
        yPosition += 15;

        // Capturar el contenido principal del reporte
        const contentElement = previewRef.current;
        if (contentElement) {
          const canvas = await html2canvas(contentElement, {
            scale: 2,
            logging: false,
            useCORS: true,
            backgroundColor: '#ffffff',
          });

          const imgData = canvas.toDataURL('image/png');
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const imgWidth = pageWidth - 40; // 20mm margen en cada lado
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          // Si la imagen es más alta que la página, ajustarla
          if (yPosition + imgHeight > pageHeight - 20) {
            const scale = (pageHeight - yPosition - 20) / imgHeight;
            pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth * scale, imgHeight * scale);
          } else {
            pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
          }
        }

        const fileName = `Reporte_${reportType}_${formatDate(dateRange.from)}_${formatDate(dateRange.to)}.pdf`;
        pdf.save(fileName);
      } else if (type === 'excel') {
        // Preparar datos detallados para Excel
        const exportData = finalChartData.map(item => {
          const period = item.name;
          const occupiedRooms = data?.occupancy?.data?.find(d => d.period === item.period)?.occupiedRoomNights || 0;
          const availableRooms = data?.occupancy?.data?.find(d => d.period === item.period)?.availableRoomNights || 0;

          return {
            'Período': period,
            'Ingresos Totales': item.ingresos,
            'Ingresos por Habitaciones': item.roomRevenue || 0,
            'Ingresos por Servicios': item.servicesRevenue || 0,
            'Habitaciones Ocupadas': occupiedRooms,
            'Habitaciones Disponibles': availableRooms,
            'Ocupación (%)': ((occupiedRooms / availableRooms) * 100).toFixed(2),
            'Check-ins': item.checkIns
          };
        });

        // Agregar resumen al inicio del archivo
        const summaryData = [{
          'Período': 'RESUMEN DEL REPORTE',
          'Ingresos Totales': data?.revenue?.total || 0,
          'Habitaciones Ocupadas Totales': data?.occupancy?.data?.reduce((sum, d) => sum + (d.occupiedRoomNights || 0), 0) || 0,
          'Habitaciones Disponibles Totales': data?.occupancy?.data?.reduce((sum, d) => sum + (d.availableRoomNights || 0), 0) || 0,
          'Ocupación Promedio (%)': data?.occupancy?.average?.toFixed(2) || 0,
          'Total Check-ins': data?.checkIns?.total || 0
        }, {
          'Período': '',
        }, ...exportData];

        if (summaryData.length > 0) {
          const fileName = `Reporte_${reportType}_${format(dateRange.from, 'yyyy-MM-dd')}_${format(dateRange.to, 'yyyy-MM-dd')}`;
          exportToExcel(summaryData, fileName);
        } else {
          alert('No hay datos para exportar');
        }
      }
    } catch (error) {
      console.error('Error al generar archivo:', error);
      alert('Error al generar el archivo. Por favor, intenta nuevamente.');
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
                {Object.entries({ bar: 'Barras', pie: 'Circular', excel: 'Excel' }).map(([key, label]) => (
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
                {selectedCharts.bar && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-slate-700">Ingresos por Período</h3>
                    {finalChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={finalChartData}>
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
                    ) : (
                      <div className="flex items-center justify-center h-[250px] bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <p className="text-gray-500">Sin datos disponibles</p>
                      </div>
                    )}
                  </div>
                )}



                {selectedCharts.pie && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-slate-700">Distribución de Ingresos</h3>
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => {
                              const total = pieData.reduce((sum, item) => sum + item.value, 0);
                              const percent = ((entry.value / total) * 100).toFixed(1);
                              return `${entry.name}: ${formatCurrency(entry.value)}`;
                            }}
                            outerRadius={90}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value, name) => {
                              const total = pieData.reduce((sum, item) => sum + item.value, 0);
                              const percent = ((value / total) * 100).toFixed(1);
                              return [formatCurrency(value), name];
                            }}
                            contentStyle={{ fontSize: '12px', borderRadius: '6px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[250px] bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <p className="text-gray-500">Sin datos disponibles</p>
                      </div>
                    )}
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
          <div className="flex gap-2">
            <Button onClick={() => handleDownload('excel')} disabled={isGenerating} className="bg-emerald-600 hover:bg-emerald-700">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button onClick={() => handleDownload('pdf')} disabled={isGenerating} className="bg-cyan-600 hover:bg-cyan-700">
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Generando...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </>
              )}
            </Button>
          </div>
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
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-[1fr,auto]">
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
                    tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value}
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

        {/* Total Clientes y Clientes Nuevos verticalmente */}
        <div className="flex flex-col gap-4 min-w-[200px]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
              <Users className="h-4 w-4 text-cyan-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-cyan-600">
                {clientStats?.totalClients || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Clientes activos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Nuevos</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {clientStats?.newClients || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Últimos 30 días</p>
            </CardContent>
          </Card>
        </div>
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
    getMonthlyRevenue,
    getMonthlyOccupancy,
  } = useReportsApi();

  const [reportType, setReportType] = useState('room'); // 'client', 'room', 'roomType', 'topClients' - iniciar con 'room'
  const [selectedEntity, setSelectedEntity] = useState(''); // Todas las habitaciones por defecto
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedRoomType, setSelectedRoomType] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null); // Default: todas las habitaciones
  const [availableFloors, setAvailableFloors] = useState([]);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(new Date().setDate(new Date().getDate() - 1)), // AYER, no hoy
  });
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isFromDateOpen, setIsFromDateOpen] = useState(false);
  const [isToDateOpen, setIsToDateOpen] = useState(false);

  // Estados para nuevos reportes
  const [selectedAgeRange, setSelectedAgeRange] = useState(null);
  const [selectedMinAge, setSelectedMinAge] = useState('');
  const [selectedMaxAge, setSelectedMaxAge] = useState('');
  const [selectedSpendingRange, setSelectedSpendingRange] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [availableCountries, setAvailableCountries] = useState([]);
  const [availableRegions, setAvailableRegions] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);
  const [quickPeriodCustom, setQuickPeriodCustom] = useState('30days');
  const [autoGenerated, setAutoGenerated] = useState(false);

  // Listas de ejemplo (en producción deberían venir de la API)
  const [clients, setClients] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);

  // Constantes para rangos
  const AGE_RANGES = [
    { value: '4-17', label: '4-17 años' },
    { value: '18-25', label: '18-25 años' },
    { value: '26-35', label: '26-35 años' },
    { value: '36-45', label: '36-45 años' },
    { value: '46-60', label: '46-60 años' },
    { value: 'Mayor de 60', label: 'Mayor de 60 años' },
  ];

  const SPENDING_RANGES = [
    { value: 'Menos de $50.000', label: 'Menos de $50.000' },
    { value: '$50.000 - $99.999', label: '$50.000 - $99.999' },
    { value: '$100.000 - $199.999', label: '$100.000 - $199.999' },
    { value: '$200.000 - $499.999', label: '$200.000 - $499.999' },
    { value: '$500.000 o más', label: '$500.000 o más' },
  ];

  const COLORS = ['#f97316', '#8b5cf6', '#3b82f6', '#10b981', '#06b6d4', '#ef4444', '#f59e0b', '#14b8a6'];

  // Efecto para filtrar habitaciones cuando cambia el piso seleccionado
  useEffect(() => {
    if (selectedFloor) {
      setFilteredRooms(rooms.filter(room => room.floor === selectedFloor));
    } else {
      setFilteredRooms(rooms);
    }
  }, [selectedFloor, rooms]);

  // Efecto separado para generar reporte cuando cambia el tipo de habitación
  useEffect(() => {
    if (selectedRoomType && reportType === 'roomType') {
      handleGenerateReport();
    }
  }, [selectedRoomType, reportType]);

  // useEffect para cargar países cuando se selecciona reporte por ubicación
  useEffect(() => {
    if (reportType === 'byLocation') {
      const loadCountries = async () => {
        try {
          const response = await fetch('http://localhost:3001/api/v1/reports/available-countries', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          });
          const result = await response.json();
          if (result.success) {
            setAvailableCountries(result.data);
          }
        } catch (error) {
          console.error('Error al cargar países:', error);
        }
      };
      loadCountries();
    }
  }, [reportType]);

  // useEffect para cargar regiones cuando se selecciona un país - YA NO SE USA
  /* useEffect(() => {
    if (selectedCountry && reportType === 'byLocation') {
      const loadRegions = async () => {
        try {
          const response = await fetch(`http://localhost:3001/api/v1/reports/by-country?startDate=2000-01-01&endDate=${format(new Date(), 'yyyy-MM-dd')}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          });
          const result = await response.json();
          if (result.success) {
            const regions = [...new Set(
              result.data
                .filter(item => item.country === selectedCountry && item.region)
                .map(item => item.region)
            )];
            setAvailableRegions(regions);
          }
        } catch (error) {
          console.error('Error al cargar regiones:', error);
        }
      };
      loadRegions();
    } else {
      setAvailableRegions([]);
      setSelectedRegion(null);
    }
  }, [selectedCountry, reportType]); */

  // useEffect para cargar ciudades cuando se selecciona una región - YA NO SE USA
  /* useEffect(() => {
    if (selectedRegion && selectedCountry && reportType === 'byLocation') {
      const loadCities = async () => {
        try {
          const response = await fetch(`http://localhost:3001/api/v1/reports/by-country?startDate=2000-01-01&endDate=${format(new Date(), 'yyyy-MM-dd')}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          });
          const result = await response.json();
          if (result.success) {
            const cities = [...new Set(
              result.data
                .filter(item => 
                  item.country === selectedCountry && 
                  item.region === selectedRegion && 
                  item.city
                )
                .map(item => item.city)
            )];
            setAvailableCities(cities);
          }
        } catch (error) {
          console.error('Error al cargar ciudades:', error);
        }
      };
      loadCities();
    } else {
      setAvailableCities([]);
      setSelectedCity(null);
    }
  }, [selectedRegion, selectedCountry, reportType]); */

  // Función para cargar habitaciones basadas en el piso seleccionado
  const loadRoomsByFloor = async (floor = null) => {
    try {
      const url = floor 
        ? `http://localhost:3001/api/v1/admin/rooms?floor=${floor}`
        : 'http://localhost:3001/api/v1/admin/rooms';
      
      const roomsResponse = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (roomsResponse.ok) {
        const roomsData = await roomsResponse.json();
        const rawData = Array.isArray(roomsData) ? roomsData : (roomsData.data || []);
        const roomsList = rawData
          .filter(r => r.is_active !== false)
          .map(r => ({
            id: r.id,
            roomNumber: r.room_number || 'S/N',
            type: r.room_types?.name || 'Sin tipo',
            floor: r.floor
          }));
        setRooms(roomsList);
      }
    } catch (error) {
      console.error('Error al cargar habitaciones:', error);
      setRooms([]);
    }
  };

  // Efecto para recargar habitaciones cuando cambia el piso seleccionado
  useEffect(() => {
    loadRoomsByFloor(selectedFloor);
  }, [selectedFloor]);

  // Cargar pisos disponibles
  useEffect(() => {
    const loadAvailableFloors = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/v1/admin/rooms', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const rooms = Array.isArray(data) ? data : (data.data || []);
          const floors = [...new Set(rooms.map(room => room.floor))].filter(f => f != null).sort((a, b) => a - b);
          setAvailableFloors(floors);
        }
      } catch (error) {
        console.error('Error al cargar pisos:', error);
      }
    };

    loadAvailableFloors();
  }, []);

  // useEffect para regenerar reporte automáticamente cuando cambian los filtros
  useEffect(() => {
    if (reportType && dateRange.from && dateRange.to) {
      // Delay de 500ms para evitar múltiples llamadas mientras el usuario cambia filtros
      const timer = setTimeout(() => {
        generateReportPreview();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [reportType, dateRange, selectedFloor, selectedRoomType, selectedEntity, selectedCountry, selectedRegion, selectedCity, selectedAgeRange, selectedSpendingRange]);



  // Cargar clientes filtrados según piso, tipo de habitación y fechas
  const loadFilteredClients = async () => {
    try {
      // Construir query params con filtros
      const params = new URLSearchParams();
      if (selectedFloor) params.append('floor', selectedFloor);
      if (selectedRoomType) params.append('roomTypeId', selectedRoomType);
      if (dateRange.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
      if (dateRange.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
      
      const url = `http://localhost:3001/api/v1/reports/clients-with-reservations?${params.toString()}`;
      console.log('🔍 Cargando clientes filtrados:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const clientsList = (data.data || []).map(c => ({
          id: c.userId || c.id,
          name: c.fullName || c.name,
          email: c.email
        }));
        console.log('✅ Clientes filtrados cargados:', clientsList.length);
        setClients(clientsList);
      } else {
        console.error('❌ Error al cargar clientes filtrados:', response.status);
        setClients([]);
      }
    } catch (error) {
      console.error('Error al cargar clientes filtrados:', error);
      setClients([]);
    }
  };

  // Ya no se necesita recargar clientes (sección eliminada)

  useEffect(() => {
    // Cargar listas reales desde la base de datos
    const loadData = async () => {
      try {
        // Cargar clientes que tienen reservas
        const clientsResponse = await fetch('http://localhost:3001/api/v1/guests?limit=200', {
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

        // Cargar habitaciones activas desde el endpoint de admin que incluye relaciones
        const roomsResponse = await fetch('http://localhost:3001/api/v1/admin/rooms', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        if (roomsResponse.ok) {
          const roomsData = await roomsResponse.json();
          // El backend puede devolver el array directamente o en { data: [...] }
          const rawData = Array.isArray(roomsData) ? roomsData : (roomsData.data || []);
          // Filtrar solo habitaciones activas y mapear los datos
          const roomsList = rawData
            .filter(r => r.is_active !== false)
            .map(r => ({
              id: r.id,
              roomNumber: r.room_number || 'S/N',
              type: r.room_types?.name || 'Sin tipo'
            }));
          setRooms(roomsList);
        } else {
          const errorText = await roomsResponse.text();
          console.error('❌ Error al cargar habitaciones:', roomsResponse.status, errorText);
        }

        // Cargar tipos de habitación activos
        const typesResponse = await fetch('http://localhost:3001/api/v1/admin/rooms/room-types?isActive=true', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        if (typesResponse.ok) {
          const typesData = await typesResponse.json();
          // El backend puede devolver el array directamente o en { data: [...] }
          const rawData = Array.isArray(typesData) ? typesData : (typesData.data || []);
          const typesList = rawData.map(rt => ({
            id: rt.id,
            name: rt.name
          }));
          setRoomTypes(typesList);
        } else {
          const errorText = await typesResponse.text();
          console.error('❌ Error al cargar tipos de habitación:', typesResponse.status, errorText);
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

  // Función para manejar períodos rápidos
  const handleQuickPeriodCustom = (period) => {
    setQuickPeriodCustom(period);
    // Usar AYER como fecha final (excepto para "all" que usa HOY para coincidir con Ingresos Totales)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    let from;
    let to = yesterday; // Por defecto ayer
    
    switch(period) {
      case 'today':
        from = yesterday; // Mostrar datos de ayer
        break;
      case '7days':
        from = new Date(yesterday.getTime() - 6 * 24 * 60 * 60 * 1000); // 7 días total
        break;
      case '14days':
        from = new Date(yesterday.getTime() - 13 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        from = new Date(yesterday.getTime() - 29 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        from = new Date(yesterday.getTime() - 89 * 24 * 60 * 60 * 1000);
        break;
      case '365days':
        from = new Date(yesterday.getTime() - 364 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        // Desde siempre: desde el inicio de 2025 hasta AYER
        from = new Date(2025, 0, 1); // 1 de enero de 2025
        to = yesterday; // AYER, no hoy
        break;
      default:
        from = new Date(yesterday.getTime() - 29 * 24 * 60 * 60 * 1000);
    }
    
    setDateRange({ from, to });
  };

  // Función para procesar datos de reportes (debe estar antes de handleGenerateReport)
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
        totalGuests: item.totalGuests || 0,
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

    // ✅ Total de personas = suma de reservationCount (check-ins únicos)
    const totalGuests = revenueArray.reduce((sum, item) => sum + (item.reservationCount || 0), 0);

    return {
      revenue: processedRevenue,
      occupancy: processedOccupancy,
      checkIns: processedCheckIns,
      totalGuests,
    };
  };

  // useEffect para generar reporte automáticamente cuando cambian los filtros
  useEffect(() => {
    if (reportType && dateRange.from && dateRange.to) {
      // Delay de 300ms para evitar múltiples llamadas mientras el usuario cambia filtros
      const timer = setTimeout(() => {
        generateReportPreview();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [reportType, dateRange, selectedFloor, selectedRoomType, selectedEntity, selectedCountry, selectedRegion, selectedCity, selectedAgeRange, selectedSpendingRange]);

  const generateReportPreview = async () => {
    if (!dateRange.from || !dateRange.to) return;
    
    setIsGeneratingPreview(true);
    
    try {
      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = format(dateRange.to, 'yyyy-MM-dd');
      
      const days = Math.ceil((dateRange.to - dateRange.from) / (1000 * 60 * 60 * 24));
      let groupBy = 'day';
      if (days > 90) groupBy = 'month';
      else if (days > 31) groupBy = 'week';
      
      const params = new URLSearchParams({
        startDate,
        endDate,
        groupBy
      });
      
      if (selectedFloor) params.append('floor', selectedFloor);
      if (selectedRoomType) params.append('roomTypeId', selectedRoomType);
      
      const urlRevenue = `http://localhost:3001/api/v1/reports/revenue?${params.toString()}`;
      const urlOccupancy = `http://localhost:3001/api/v1/reports/occupancy?${params.toString()}`;
      
      const [revenueRes, occupancyRes] = await Promise.all([
        fetch(urlRevenue, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(urlOccupancy, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })
      ]);
      
      const revenue = await revenueRes.json();
      const occupancy = await occupancyRes.json();
      
      const processed = processReportData(
        { data: revenue.data || [] },
        { data: occupancy.data || [] }
      );
      
      setReportData(processed);
    } catch (error) {
      console.error('Error al generar preview:', error);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!dateRange.from || !dateRange.to) {
      alert('Por favor seleccione un rango de fechas');
      return;
    }

    setIsLoading(true);
    setReportData(null); // Limpiar datos anteriores

    try {
      const startDate = format(dateRange.from, 'yyyy-MM-dd');
      const endDate = format(dateRange.to, 'yyyy-MM-dd');
      
      let data;
      const params = {
        ...(selectedFloor !== null ? { floor: selectedFloor } : {})
      };
      
      switch (reportType) {
        case 'client':
          if (!selectedEntity) {
            alert('Seleccione un cliente');
            setIsLoading(false);
            return;
          }
          data = await getClientCustomReport(selectedEntity, startDate, endDate, params);
          break;
        case 'room':
          // Permitir generar reporte de todas las habitaciones si no se selecciona una específica
          if (selectedEntity) {
            data = await getRoomCustomReport(selectedEntity, startDate, endDate, params);
          } else {
            // Generar reporte general de todas las habitaciones
            const params2 = new URLSearchParams();
            params2.append('startDate', startDate);
            params2.append('endDate', endDate);
            params2.append('groupBy', 'day');
            if (selectedFloor) params2.append('floor', selectedFloor);
            
            const [revenueRes, occupancyRes] = await Promise.all([
              fetch(`http://localhost:3001/api/v1/reports/revenue?${params2.toString()}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
              }),
              fetch(`http://localhost:3001/api/v1/reports/occupancy?${params2.toString()}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
              })
            ]);
            
            const revenue = await revenueRes.json();
            const occupancy = await occupancyRes.json();
            data = processReportData(revenue, occupancy);
          }
          break;
        case 'roomType':
          // Si no hay selectedEntity, generar reporte general de todos los tipos
          if (selectedEntity) {
            data = await getRoomTypeCustomReport(selectedEntity, startDate, endDate, params);
          } else {
            // Generar reporte general de tipos de habitación
            const params2 = new URLSearchParams();
            params2.append('startDate', startDate);
            params2.append('endDate', endDate);
            params2.append('groupBy', 'day');
            
            const [revenueRes, occupancyRes] = await Promise.all([
              fetch(`http://localhost:3001/api/v1/reports/revenue?${params2.toString()}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
              }),
              fetch(`http://localhost:3001/api/v1/reports/occupancy?${params2.toString()}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
              })
            ]);
            
            const revenue = await revenueRes.json();
            const occupancy = await occupancyRes.json();
            data = processReportData(revenue, occupancy);
          }
          break;
        case 'topClients':
          data = await getTopClientsRevenue(startDate, endDate, 50, params);
          break;
        case 'byLocation':
          try {
            const countryParams = new URLSearchParams({
              startDate,
              endDate
            });
            
            if (selectedFloor) countryParams.append('floor', selectedFloor);
            if (selectedRoomType) countryParams.append('roomTypeId', selectedRoomType);
            // Asegurarse de enviar el país correctamente
            if (selectedCountry) countryParams.append('country', selectedCountry.trim());
            // NO enviar region ni city ya que fueron eliminados
            
            const countryRes = await fetch(`http://localhost:3001/api/v1/reports/by-country?${countryParams}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            });
            const countryData = await countryRes.json();
            
            if (countryData.success) {
              data = {
                type: 'byLocation',
                data: countryData.data,
                period: { from: dateRange.from, to: dateRange.to },
                filters: {
                  country: selectedCountry,
                  region: selectedRegion,
                  city: selectedCity
                }
              };
            }
          } catch (error) {
            console.error('Error al generar reporte por ubicación:', error);
          }
          break;
        case 'byAge':
          try {
            const ageParams = new URLSearchParams({
              startDate,
              endDate
            });
            
            // Priorizar rango manual sobre predefinido
            if (selectedMinAge && selectedMaxAge) {
              // Validar que sean mayores o iguales a 4
              const minAge = parseInt(selectedMinAge);
              const maxAge = parseInt(selectedMaxAge);
              if (minAge >= 4 && maxAge >= 4 && minAge <= maxAge) {
                ageParams.append('minAge', minAge);
                ageParams.append('maxAge', maxAge);
              }
            } else if (selectedAgeRange) {
              ageParams.append('ageRange', selectedAgeRange);
            }
            
            if (selectedFloor) ageParams.append('floor', selectedFloor);
            if (selectedRoomType) ageParams.append('roomTypeId', selectedRoomType);
            
            const ageRes = await fetch(`http://localhost:3001/api/v1/reports/by-age?${ageParams}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            });
            const ageData = await ageRes.json();
            
            if (ageData.success) {
              data = {
                type: 'byAge',
                data: ageData.data,
                period: { from: dateRange.from, to: dateRange.to }
              };
            }
          } catch (error) {
            console.error('Error al generar reporte por edad:', error);
          }
          break;
        case 'bySpending':
          try {
            const spendingParams = new URLSearchParams({
              startDate,
              endDate
            });
            
            if (selectedSpendingRange) spendingParams.append('spendingRange', selectedSpendingRange);
            if (selectedFloor) spendingParams.append('floor', selectedFloor);
            if (selectedRoomType) spendingParams.append('roomTypeId', selectedRoomType);
            
            const spendingRes = await fetch(`http://localhost:3001/api/v1/reports/by-spending?${spendingParams}`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
              }
            });
            const spendingData = await spendingRes.json();
            
            if (spendingData.success) {
              data = {
                type: 'bySpending',
                data: spendingData.data,
                period: { from: dateRange.from, to: dateRange.to }
              };
            }
          } catch (error) {
            console.error('Error al generar reporte por monto:', error);
          }
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

  const handleDownload = async (type = 'pdf') => {
    if (!reportData) return;

    try {
      if (type === 'pdf') {
        // Crear documento PDF
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPosition = 20;

        try {
          // Título
          doc.setFontSize(20);
          doc.setTextColor(33, 150, 243);
          doc.text('Reporte Personalizado', pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 10;

          // Período
          doc.setFontSize(12);
          doc.setTextColor(100, 100, 100);
          doc.text(
            `Período: ${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`,
            pageWidth / 2,
            yPosition,
            { align: 'center' }
          );
          yPosition += 15;

          // Contenido según tipo de reporte
          doc.setFontSize(14);
          doc.setTextColor(0, 0, 0);

          // Procesar el contenido según el tipo de reporte
          if (reportType === 'client' && reportData.data) {
            const { client, summary, reservations } = reportData.data;

            doc.text(`Cliente: ${client.fullName}`, 20, yPosition);
            yPosition += 7;
            doc.setFontSize(10);
            doc.text(`Email: ${client.email}`, 20, yPosition);
            yPosition += 5;
            doc.text(`Teléfono: ${client.phone || 'N/A'}`, 20, yPosition);
            yPosition += 10;

            doc.setFontSize(12);
            doc.text('Resumen:', 20, yPosition);
            yPosition += 7;
            doc.setFontSize(10);
            doc.text(`Total Reservas: ${summary.totalReservations}`, 25, yPosition);
            yPosition += 5;
            doc.text(`Ingresos Totales: ${formatCurrency(summary.totalRevenue)}`, 25, yPosition);
            yPosition += 5;
            doc.text(`Noches Totales: ${summary.totalNights}`, 25, yPosition);
            yPosition += 5;
            doc.text(`Promedio por Reserva: ${formatCurrency(summary.averageReservationValue)}`, 25, yPosition);
            yPosition += 10;

            // Agregar tabla de reservaciones si hay datos
            if (reservations && reservations.length > 0) {
              autoTable(doc, {
                startY: yPosition,
                head: [['Check-in', 'Check-out', 'Noches', 'Total']],
                body: reservations.map(r => [
                  format(new Date(r.checkInDate), 'dd/MM/yyyy'),
                  format(new Date(r.checkOutDate), 'dd/MM/yyyy'),
                  r.nights.toString(),
                  formatCurrency(r.totalRevenue)
                ]),
                theme: 'grid',
                headStyles: { fillColor: [33, 150, 243] },
                margin: { left: 20, right: 20 },
              });
            }
          }

          // Capturar gráficos con html2canvas
          const chartElements = document.querySelectorAll('.recharts-wrapper');
          if (chartElements.length > 0) {
            yPosition = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : yPosition + 15;
            
            doc.setFontSize(14);
            doc.text('Gráficos:', 20, yPosition);
            yPosition += 10;

            for (let i = 0; i < chartElements.length; i++) {
              const chart = chartElements[i];
              
              try {
                // Capturar el gráfico como imagen
                const canvas = await html2canvas(chart, {
                  scale: 2,
                  backgroundColor: '#ffffff',
                  logging: false
                });
                
                const imgData = canvas.toDataURL('image/png');
                const imgWidth = 170; // ancho en mm
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                
                // Si no cabe en la página actual, agregar nueva página
                if (yPosition + imgHeight > pageHeight - 20) {
                  doc.addPage();
                  yPosition = 20;
                }
                
                doc.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
                yPosition += imgHeight + 10;
              } catch (canvasError) {
                console.error('Error al capturar gráfico:', canvasError);
              }
            }
          }

          // Guardar el PDF
          const fileName = `Reporte_${reportType}_${format(dateRange.from, 'yyyy-MM-dd')}_${format(dateRange.to, 'yyyy-MM-dd')}.pdf`;
          doc.save(fileName);

        } catch (pdfError) {
          console.error('Error al generar el PDF:', pdfError);
          throw new Error('Error al generar el PDF');
        }
      } else if (type === 'excel') {
      // Preparar datos para Excel
      let exportData = [];

      if (reportData.data) {
        if (reportType === 'client') {
          exportData = reportData.data.reservations?.map(r => {
            // Extraer la información de las habitaciones de manera segura
            const roomNumbers = Array.isArray(r.rooms) ? r.rooms.map(room => room.roomNumber || 'N/A').join(', ') : 'N/A';
            const roomTypes = Array.isArray(r.rooms) ? r.rooms.map(room => room.roomType || 'N/A').join(', ') : 'N/A';
            
            return {
              'Fecha Check-in': format(new Date(r.checkInDate), 'dd/MM/yyyy'),
              'Fecha Check-out': format(new Date(r.checkOutDate), 'dd/MM/yyyy'),
              'Noches': r.nights || 0,
              'N° Habitación': roomNumbers,
              'Tipo de Habitación': roomTypes,
              'Total': formatCurrency(r.totalRevenue || 0)
            };
          }) || [];
        } else if (reportType === 'room' || reportType === 'roomType') {
          exportData = reportData.data.roomsBreakdown?.map(r => ({
            'Habitación': r.roomNumber,
            'Piso': r.floor,
            'Reservas': r.reservations,
            'Noches': r.nights,
            'Ingresos': r.revenue,
            'Ocupación %': r.occupancyRate?.toFixed(2) || '0'
          })) || [];
        } else if (reportType === 'topClients') {
          exportData = reportData.data.topClients?.map(c => ({
            'Ranking': c.rank,
            'Nombre Completo': c.fullName,
            'Email': c.email,
            'Total Reservas': c.totalReservations,
            'Ingresos Totales': formatCurrency(c.totalRevenue),
            'Promedio por Reserva': formatCurrency(c.averageReservationValue)
          })) || [];
        } else if (reportType === 'byLocation') {
          exportData = reportData.data.map(item => ({
            'País': item.country,
            'Región': item.region || 'N/A',
            'Ciudad': item.city || 'N/A',
            'Total Reservas': item.reservationCount,
            'Total Personas': item.totalGuests,
            'Ingresos Totales': formatCurrency(item.totalRevenue),
            'Promedio por Reserva': formatCurrency(item.totalRevenue / item.reservationCount)
          }));
        } else if (reportType === 'byAge') {
          exportData = reportData.data.map(item => ({
            'Rango de Edad': item.ageRange,
            'Total Reservas': item.reservationCount,
            'Total Personas': item.totalGuests,
            'Ingresos Totales': formatCurrency(item.totalRevenue),
            'Promedio por Reserva': formatCurrency(item.totalRevenue / item.reservationCount)
          }));
        } else if (reportType === 'bySpending') {
          exportData = reportData.data.map(item => ({
            'Rango de Gasto': item.spendingRange,
            'Total Reservas': item.reservationCount,
            'Total Personas': item.totalGuests,
            'Ingresos Totales': formatCurrency(item.totalRevenue),
            'Promedio por Reserva': formatCurrency(item.totalRevenue / item.reservationCount)
          }));
        }

        // Agregar resumen al inicio del archivo si hay datos
        if (exportData.length > 0) {
          const summaryData = [{
            'Resumen': 'DATOS DEL REPORTE',
            'Fecha Check-in': '',
            'Fecha Check-out': '',
            'Noches': '',
            'N° Habitación': '',
            'Tipo de Habitación': '',
            'Total': ''
          }, {
            'Resumen': `Cliente: ${reportData.data.client?.fullName || 'N/A'}`,
            'Fecha Check-in': '',
            'Fecha Check-out': '',
            'Noches': '',
            'N° Habitación': '',
            'Tipo de Habitación': '',
            'Total': ''
          }, {
            'Resumen': `Email: ${reportData.data.client?.email || 'N/A'}`,
            'Fecha Check-in': '',
            'Fecha Check-out': '',
            'Noches': '',
            'N° Habitación': '',
            'Tipo de Habitación': '',
            'Total': ''
          }, {
            'Resumen': `Teléfono: ${reportData.data.client?.phone || 'N/A'}`,
            'Fecha Check-in': '',
            'Fecha Check-out': '',
            'Noches': '',
            'N° Habitación': '',
            'Tipo de Habitación': '',
            'Total': ''
          }, {
            'Resumen': `Total Reservas: ${reportData.data.summary?.totalReservations || 0}`,
            'Fecha Check-in': '',
            'Fecha Check-out': '',
            'Noches': '',
            'N° Habitación': '',
            'Tipo de Habitación': '',
            'Total': ''
          }, {
            'Resumen': `Ingresos Totales: ${formatCurrency(reportData.data.summary?.totalRevenue || 0)}`,
            'Fecha Check-in': '',
            'Fecha Check-out': '',
            'Noches': '',
            'N° Habitación': '',
            'Tipo de Habitación': '',
            'Total': ''
          }, {
            'Resumen': '',
            'Fecha Check-in': '',
            'Fecha Check-out': '',
            'Noches': '',
            'N° Habitación': '',
            'Tipo de Habitación': '',
            'Total': ''
          }, ...exportData];

          const fileName = `Reporte_${reportType}_${format(dateRange.from, 'yyyy-MM-dd')}_${format(dateRange.to, 'yyyy-MM-dd')}`;
          exportToExcel(summaryData, fileName);
        } else {
          alert('No hay datos para exportar');
        }
      }
    }

    if (type === 'pdf') {
      // Procesamiento según tipo de reporte
      if (reportType === 'client' && reportData.data) {
        const { client, summary, reservations } = reportData.data;

        // Generar PDF específico para cliente
        if (type === 'pdf') {
          doc.text(`Cliente: ${client.fullName}`, 20, yPosition);
          yPosition += 7;
          doc.setFontSize(10);
          doc.text(`Email: ${client.email}`, 20, yPosition);
          yPosition += 5;
          doc.text(`Teléfono: ${client.phone || 'N/A'}`, 20, yPosition);
          yPosition += 10;

          doc.setFontSize(12);
          doc.text('Resumen:', 20, yPosition);
          yPosition += 7;
          doc.setFontSize(10);
          doc.text(`Total Reservas: ${summary.totalReservations}`, 25, yPosition);
          yPosition += 5;
          doc.text(`Ingresos Totales: ${formatCurrency(summary.totalRevenue)}`, 25, yPosition);
          yPosition += 5;
          doc.text(`Noches Totales: ${summary.totalNights}`, 25, yPosition);
          yPosition += 5;
          doc.text(`Promedio por Reserva: ${formatCurrency(summary.averageReservationValue)}`, 25, yPosition);
          yPosition += 10;

          // Tabla de reservas
          if (reservations && reservations.length > 0) {
            doc.setFontSize(12);
            doc.text('Historial de Reservas:', 20, yPosition);
            yPosition += 7;

            const tableData = reservations.map(r => [
              format(new Date(r.checkInDate), 'dd/MM/yyyy'),
              format(new Date(r.checkOutDate), 'dd/MM/yyyy'),
              r.nights.toString(),
              formatCurrency(r.totalRevenue)
            ]);

            // Usar la importación de autoTable
            autoTable(doc, {
              startY: yPosition,
              head: [['Check-in', 'Check-out', 'Noches', 'Total']],
              body: tableData,
              theme: 'grid',
              headStyles: { fillColor: [33, 150, 243] },
              margin: { left: 20, right: 20 },
            });
          }
        }
      } else if (reportType === 'room' && reportData.data) {
        const { room, summary, reservations } = reportData.data;

        // Generar PDF específico para habitación
        if (type === 'pdf') {
          doc.text(`Habitación: ${room.roomNumber}`, 20, yPosition);
          yPosition += 7;
          doc.setFontSize(10);
          doc.text(`Tipo: ${room.roomType}`, 20, yPosition);
          yPosition += 5;
          doc.text(`Piso: ${room.floor}`, 20, yPosition);
          yPosition += 10;

          doc.setFontSize(12);
          doc.text('Resumen:', 20, yPosition);
          yPosition += 7;
          doc.setFontSize(10);
          doc.text(`Total Reservas: ${summary.totalReservations}`, 25, yPosition);
          yPosition += 5;
          doc.text(`Ingresos Totales: ${formatCurrency(summary.totalRevenue)}`, 25, yPosition);
          yPosition += 5;
          doc.text(`Ocupación: ${summary.occupancyRate.toFixed(2)}%`, 25, yPosition);
          yPosition += 5;
          doc.text(`Tarifa Promedio: ${formatCurrency(summary.averageNightlyRate)}`, 25, yPosition);
        }
      } else if (reportType === 'roomType' && reportData.data) {
        const { roomType, summary, roomsBreakdown } = reportData.data;

        // Generar PDF específico para tipo de habitación
        if (type === 'pdf') {
          doc.text(`Tipo de Habitación: ${roomType.name}`, 20, yPosition);
          yPosition += 7;
          doc.setFontSize(10);
          doc.text(`Total de habitaciones de este tipo: ${roomType.totalRooms}`, 20, yPosition);
          yPosition += 10;

          doc.setFontSize(12);
          doc.text('Resumen:', 20, yPosition);
          yPosition += 7;
          doc.setFontSize(10);
          doc.text(`Total Reservas: ${summary.totalReservations}`, 25, yPosition);
          yPosition += 5;
          doc.text(`Ingresos Totales: ${formatCurrency(summary.totalRevenue)}`, 25, yPosition);
          yPosition += 5;
          doc.text(`Ocupación: ${summary.occupancyRate.toFixed(2)}%`, 25, yPosition);
          yPosition += 5;
          doc.text(`Tarifa Promedio: ${formatCurrency(summary.averageNightlyRate)}`, 25, yPosition);
          yPosition += 5;
          doc.text(`RevPAR: ${formatCurrency(summary.revPAR)}`, 25, yPosition);
          yPosition += 10;

          // Tabla de desglose por habitación
          if (roomsBreakdown && roomsBreakdown.length > 0) {
            doc.setFontSize(12);
            doc.text('Desglose por Habitaciones:', 20, yPosition);
            yPosition += 7;

            const tableData = roomsBreakdown.map(r => [
              r.roomNumber,
              r.floor.toString(),
              r.reservations.toString(),
              r.nights.toString(),
              formatCurrency(r.revenue),
              `${r.occupancyRate?.toFixed(2) || '0'}%`
            ]);

            autoTable(doc, {
              startY: yPosition,
              head: [['Habitación', 'Piso', 'Reservas', 'Noches', 'Ingresos', 'Ocupación']],
              body: tableData,
              theme: 'grid',
              headStyles: { fillColor: [139, 92, 246] },
              margin: { left: 20, right: 20 },
            });
          }
        }
        doc.setFontSize(12);
        doc.text('Desglose por Habitación:', 20, yPosition);
        yPosition += 7;

        const tableData = roomsBreakdown.map(r => [
          r.roomNumber,
          `Piso ${r.floor}`,
          r.reservations.toString(),
          r.nights.toString(),
          formatCurrency(r.revenue)
        ]);

        autoTable(doc, {
          startY: yPosition,
          head: [['Habitación', 'Piso', 'Reservas', 'Noches', 'Ingresos']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [139, 92, 246] },
          margin: { left: 20, right: 20 },
        });
      }
    } else if (reportType === 'topClients' && reportData.data) {
      const { topClients, totalClients } = reportData.data;

      doc.text(`Total de Clientes: ${totalClients}`, 20, yPosition);
      yPosition += 10;

      doc.setFontSize(12);
      doc.text('Top Clientes por Ingresos:', 20, yPosition);
      yPosition += 7;

      const tableData = topClients.map(c => [
        c.rank.toString(),
        c.fullName,
        c.totalReservations.toString(),
        formatCurrency(c.totalRevenue)
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['#', 'Cliente', 'Reservas', 'Ingresos']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
        margin: { left: 20, right: 20 },
      });
    } else if (reportType === 'byLocation' && Array.isArray(reportData.data)) {
      doc.setFontSize(14);
      doc.text('Reporte de Reservas por Ubicación Geográfica', 20, yPosition);
      yPosition += 10;

      if (selectedCountry) {
        doc.setFontSize(10);
        doc.text(`País: ${selectedCountry}`, 20, yPosition);
        yPosition += 5;
      }
      if (selectedRegion) {
        doc.text(`Región: ${selectedRegion}`, 20, yPosition);
        yPosition += 5;
      }
      if (selectedCity) {
        doc.text(`Ciudad: ${selectedCity}`, 20, yPosition);
        yPosition += 5;
      }
      yPosition += 2;

      const tableData = reportData.data.map(item => [
        item.country,
        item.region || 'N/A',
        item.city || 'N/A',
        item.reservationCount.toString(),
        item.totalGuests.toString(),
        formatCurrency(item.totalRevenue),
        formatCurrency(item.totalRevenue / item.reservationCount)
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['País', 'Región', 'Ciudad', 'Reservas', 'Personas', 'Ingresos Totales', 'Promedio/Reserva']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 20, right: 20 },
      });
    } else if (reportType === 'byAge' && Array.isArray(reportData.data)) {
      doc.setFontSize(14);
      doc.text('Reporte de Reservas por Rango de Edad', 20, yPosition);
      yPosition += 10;

      if (selectedAgeRange) {
        const rangeLabel = AGE_RANGES.find(r => r.value === selectedAgeRange)?.label;
        doc.setFontSize(10);
        doc.text(`Rango seleccionado: ${rangeLabel}`, 20, yPosition);
        yPosition += 7;
      }

      const tableData = reportData.data.map(item => [
        item.ageRange,
        item.reservationCount.toString(),
        item.totalGuests.toString(),
        formatCurrency(item.totalRevenue),
        formatCurrency(item.totalRevenue / item.reservationCount)
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Rango de Edad', 'Reservas', 'Personas', 'Ingresos Totales', 'Promedio/Reserva']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11] },
        margin: { left: 20, right: 20 },
      });
    } else if (reportType === 'bySpending' && Array.isArray(reportData.data)) {
      doc.setFontSize(14);
      doc.text('Reporte de Reservas por Monto Gastado', 20, yPosition);
      yPosition += 10;

      if (selectedSpendingRange) {
        const rangeLabel = SPENDING_RANGES.find(r => r.value === selectedSpendingRange)?.label;
        doc.setFontSize(10);
        doc.text(`Rango seleccionado: ${rangeLabel}`, 20, yPosition);
        yPosition += 7;
      }

      const tableData = reportData.data.map(item => [
        item.spendingRange,
        item.reservationCount.toString(),
        item.totalGuests.toString(),
        formatCurrency(item.totalRevenue),
        formatCurrency(item.totalRevenue / item.reservationCount)
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Rango de Gasto', 'Reservas', 'Personas', 'Ingresos Totales', 'Promedio/Reserva']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [139, 92, 246] },
        margin: { left: 20, right: 20 },
      });
    }

    // Descargar PDF con nombre personalizado
    let fileName = 'reporte';
    if (reportType === 'client' && reportData.data?.client) {
      fileName = `Reporte_Cliente_${reportData.data.client.fullName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    } else if (reportType === 'room' && reportData.data?.room) {
      fileName = `Reporte_Habitacion_${reportData.data.room.roomNumber}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    } else if (reportType === 'roomType' && reportData.data?.roomType) {
      fileName = `Reporte_Tipo_Habitacion_${reportData.data.roomType.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    } else if (reportType === 'topClients') {
      fileName = `Reporte_Top_Clientes_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    } else {
      fileName = `reporte-${reportType}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    }
    doc.save(fileName);
  } catch (error) {
    console.error('Error al generar archivo:', error);
    alert('Error al generar el archivo. Por favor, intenta nuevamente.');
  }
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
      {/* Generador de Reportes Personalizados */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Generador de Reportes Personalizados</CardTitle>
          <p className="text-muted-foreground">Crea reportes detallados por habitación, tipo de habitación, ranking de clientes, país, edad y más</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selector de tipo de reporte */}
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Card
              className={`cursor-pointer transition-all ${reportType === 'room' ? 'ring-2 ring-green-500' : 'hover:shadow-lg'}`}
              onClick={() => { 
                setReportType('room');
                setSelectedEntity(''); // Todas las habitaciones
                setSelectedFloor(null); // Todos los pisos
                setSelectedRoomType(''); // Todos los tipos
              }}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Home className="h-12 w-12 mb-2 text-green-600" />
                  <h3 className="font-semibold">Por Habitación</h3>
                  <p className="text-xs text-muted-foreground mt-1">Ocupación e ingresos</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all ${reportType === 'roomType' ? 'ring-2 ring-purple-500' : 'hover:shadow-lg'}`}
              onClick={() => { 
                setReportType('roomType');
                setSelectedEntity(''); // Todos los tipos
                setSelectedFloor(null);
                setSelectedRoomType('');
              }}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Home className="h-12 w-12 mb-2 text-purple-600" />
                  <h3 className="font-semibold">Por Tipo Habitación</h3>
                  <p className="text-xs text-muted-foreground mt-1">Rendimiento por tipo</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all ${reportType === 'topClients' ? 'ring-2 ring-orange-500' : 'hover:shadow-lg'}`}
              onClick={() => { 
                setReportType('topClients');
                setSelectedFloor(null);
                setSelectedRoomType('');
              }}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <TrendingUp className="h-12 w-12 mb-2 text-orange-600" />
                  <h3 className="font-semibold">Top Clientes</h3>
                  <p className="text-xs text-muted-foreground mt-1">Ranking por ingresos</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all ${reportType === 'byLocation' ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'}`}
              onClick={() => { 
                setReportType('byLocation');
                setSelectedCountry(null); // Todos los países
                setSelectedRegion(null);
                setSelectedCity(null);
              }}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Globe className="h-12 w-12 mb-2 text-blue-600" />
                  <h3 className="font-semibold">Por Ubicación</h3>
                  <p className="text-xs text-muted-foreground mt-1">País / Región / Ciudad</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all ${reportType === 'byAge' ? 'ring-2 ring-pink-500' : 'hover:shadow-lg'}`}
              onClick={() => { 
                setReportType('byAge');
                setSelectedAgeRange(''); // Todos los rangos
              }}
            >
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Users className="h-12 w-12 mb-2 text-pink-600" />
                  <h3 className="font-semibold">Por Edad</h3>
                  <p className="text-xs text-muted-foreground mt-1">Rangos de edad</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formulario de selección */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Filtros para Por Habitación */}
            {reportType === 'room' && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Filtrar por Piso</Label>
                  <select
                    value={selectedFloor || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : null;
                      setSelectedFloor(value);
                    }}
                    className="w-full p-3 border rounded-md bg-background text-foreground"
                  >
                    <option value="">Todos los Pisos</option>
                    {availableFloors.map((floor) => (
                      <option key={floor} value={floor}>
                        Piso {floor}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Filtrar por Tipo de Habitación</Label>
                  <select
                    value={selectedRoomType || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : null;
                      setSelectedRoomType(value);
                    }}
                    className="w-full p-3 border rounded-md bg-background text-foreground"
                  >
                    <option value="">Todos los Tipos</option>
                    {roomTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Seleccionar Habitación</Label>
                  <select
                    value={selectedEntity}
                    onChange={(e) => setSelectedEntity(e.target.value)}
                    className="w-full p-3 border rounded-md bg-background text-foreground"
                  >
                    <option value="">Todas las Habitaciones</option>
                    {filteredRooms.length > 0 ? filteredRooms.map(r => (
                      <option key={r.id} value={r.id}>Habitación {r.roomNumber} ({r.type}) - Piso {r.floor}</option>
                    )) : <option disabled>No hay habitaciones disponibles</option>}
                  </select>
                </div>
              </>
            )}

            {/* Filtros para Por Tipo de Habitación */}
            {reportType === 'roomType' && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Filtrar por Piso</Label>
                  <select
                    value={selectedFloor || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : null;
                      setSelectedFloor(value);
                    }}
                    className="w-full p-3 border rounded-md bg-background text-foreground"
                  >
                    <option value="">Todos los Pisos</option>
                    {availableFloors.map((floor) => (
                      <option key={floor} value={floor}>
                        Piso {floor}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Seleccionar Tipo de Habitación</Label>
                  <select
                    value={selectedEntity}
                    onChange={(e) => setSelectedEntity(e.target.value)}
                    className="w-full p-3 border rounded-md bg-background text-foreground"
                  >
                    <option value="">Todos los Tipos</option>
                    {roomTypes.length > 0 ? roomTypes.map(rt => (
                      <option key={rt.id} value={rt.id}>{rt.name}</option>
                    )) : <option disabled>Cargando tipos de habitación...</option>}
                  </select>
                </div>
              </>
            )}

            {/* Filtros para Top Clientes */}
            {reportType === 'topClients' && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Filtrar por Piso</Label>
                  <select
                    value={selectedFloor || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : null;
                      setSelectedFloor(value);
                    }}
                    className="w-full p-3 border rounded-md bg-background text-foreground"
                  >
                    <option value="">Todos los Pisos</option>
                    {availableFloors.map((floor) => (
                      <option key={floor} value={floor}>
                        Piso {floor}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Filtrar por Tipo de Habitación</Label>
                  <select
                    value={selectedRoomType || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : null;
                      setSelectedRoomType(value);
                    }}
                    className="w-full p-3 border rounded-md bg-background text-foreground"
                  >
                    <option value="">Todos los Tipos</option>
                    {roomTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Filtros para Por Edad */}
            {reportType === 'byAge' && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Filtrar por Piso</Label>
                  <select
                    value={selectedFloor || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : null;
                      setSelectedFloor(value);
                    }}
                    className="w-full p-3 border rounded-md bg-background text-foreground"
                  >
                    <option value="">Todos los Pisos</option>
                    {availableFloors.map((floor) => (
                      <option key={floor} value={floor}>
                        Piso {floor}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Filtrar por Tipo de Habitación</Label>
                  <select
                    value={selectedRoomType || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : null;
                      setSelectedRoomType(value);
                    }}
                    className="w-full p-3 border rounded-md bg-background text-foreground"
                  >
                    <option value="">Todos los Tipos</option>
                    {roomTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Rango de Edad Predefinido</Label>
                  <select
                    value={selectedAgeRange || ''}
                    onChange={(e) => {
                      setSelectedAgeRange(e.target.value || null);
                      // Limpiar campos manuales al seleccionar predefinido
                      setSelectedMinAge('');
                      setSelectedMaxAge('');
                    }}
                    className="w-full p-3 border rounded-md bg-background text-foreground"
                  >
                    <option value="">Seleccionar rango predefinido</option>
                    {AGE_RANGES.map((range) => (
                      <option key={range.value} value={range.value}>
                        {range.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Edad Mínima (Manual)</Label>
                  <input
                    type="number"
                    min="4"
                    max="120"
                    value={selectedMinAge}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || (parseInt(value) >= 4 && parseInt(value) <= 120)) {
                        setSelectedMinAge(value);
                        setSelectedAgeRange(null); // Reset predefined range
                      }
                    }}
                    placeholder="Mínimo 4 años"
                    className="w-full p-3 border rounded-md bg-background text-foreground"
                    disabled={selectedAgeRange !== null && selectedAgeRange !== ''}
                  />
                  {selectedMinAge && parseInt(selectedMinAge) < 4 && (
                    <p className="text-xs text-red-500">La edad mínima debe ser 4 años</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Edad Máxima (Manual)</Label>
                  <input
                    type="number"
                    min="4"
                    max="120"
                    value={selectedMaxAge}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || (parseInt(value) >= 4 && parseInt(value) <= 120)) {
                        setSelectedMaxAge(value);
                        setSelectedAgeRange(null); // Reset predefined range
                      }
                    }}
                    placeholder="Escriba edad"
                    className="w-full p-3 border rounded-md bg-background text-foreground"
                    disabled={selectedAgeRange !== null && selectedAgeRange !== ''}
                  />
                  {selectedMaxAge && selectedMinAge && parseInt(selectedMaxAge) < parseInt(selectedMinAge) && (
                    <p className="text-xs text-red-500">La edad máxima debe ser mayor a la mínima</p>
                  )}
                </div>
              </>
            )}

            {/* Filtros para Por Ubicación */}
            {reportType === 'byLocation' && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Filtrar por Piso</Label>
                  <select
                    value={selectedFloor || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : null;
                      setSelectedFloor(value);
                    }}
                    className="w-full p-3 border rounded-md bg-background text-foreground"
                  >
                    <option value="">Todos los Pisos</option>
                    {availableFloors.map((floor) => (
                      <option key={floor} value={floor}>
                        Piso {floor}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Filtrar por Tipo de Habitación</Label>
                  <select
                    value={selectedRoomType || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : null;
                      setSelectedRoomType(value);
                    }}
                    className="w-full p-3 border rounded-md bg-background text-foreground"
                  >
                    <option value="">Todos los Tipos</option>
                    {roomTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">País</Label>
                  <select
                    value={selectedCountry || ''}
                    onChange={(e) => {
                      const newCountry = e.target.value || null;
                      setSelectedCountry(newCountry);
                    }}
                    className="w-full p-3 border rounded-md bg-background text-foreground"
                  >
                    <option value="">Todos los países</option>
                    {availableCountries.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                  {availableCountries.length === 0 && (
                    <p className="text-xs text-muted-foreground">Cargando países...</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Período */}
          <div className="space-y-2">
              <Label>Período</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={quickPeriodCustom === 'today' ? 'default' : 'outline'}
                  onClick={() => handleQuickPeriodCustom('today')}
                >
                  Hoy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={quickPeriodCustom === '7days' ? 'default' : 'outline'}
                  onClick={() => handleQuickPeriodCustom('7days')}
                >
                  7 días
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={quickPeriodCustom === '14days' ? 'default' : 'outline'}
                  onClick={() => handleQuickPeriodCustom('14days')}
                >
                  14 días
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={quickPeriodCustom === '30days' ? 'default' : 'outline'}
                  onClick={() => handleQuickPeriodCustom('30days')}
                >
                  30 días
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={quickPeriodCustom === '90days' ? 'default' : 'outline'}
                  onClick={() => handleQuickPeriodCustom('90days')}
                >
                  Trimestre
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={quickPeriodCustom === '365days' ? 'default' : 'outline'}
                  onClick={() => handleQuickPeriodCustom('365days')}
                >
                  Anual
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {dateRange.from && dateRange.to && (
                  <>
                    {format(dateRange.from, "d 'de' MMM yyyy", { locale: es })} - {format(dateRange.to, "d 'de' MMM yyyy", { locale: es })}
                  </>
                )}
              </p>
            </div>

          {/* Selectores de fecha manual */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold">O selecciona fechas manualmente:</Label>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Fecha Desde */}
              <div className="space-y-2">
                <Label className="text-sm">Desde</Label>
                <Popover open={isFromDateOpen} onOpenChange={setIsFromDateOpen}>
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
                        format(dateRange.from, "d 'de' MMM yyyy", { locale: es })
                      ) : (
                        <span>Seleccionar fecha inicio</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => {
                        if (date) {
                          setDateRange(prev => ({ ...prev, from: date }));
                          setQuickPeriodCustom(null);
                          setIsFromDateOpen(false);
                        }
                      }}
                      initialFocus
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Fecha Hasta */}
              <div className="space-y-2">
                <Label className="text-sm">Hasta</Label>
                <Popover open={isToDateOpen} onOpenChange={setIsToDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? (
                        format(dateRange.to, "d 'de' MMM yyyy", { locale: es })
                      ) : (
                        <span>Seleccionar fecha fin</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => {
                        if (date) {
                          setDateRange(prev => ({ ...prev, to: date }));
                          setQuickPeriodCustom(null);
                          setIsToDateOpen(false);
                        }
                      }}
                      disabled={(date) => dateRange.from ? date < dateRange.from : false}
                      initialFocus
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Botón para Generar Reporte */}
          <div className="mt-6">
            <Button
              onClick={generateReportPreview}
              disabled={isGeneratingPreview || !dateRange.from || !dateRange.to}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-lg py-6"
            >
              {isGeneratingPreview ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Generando Reporte...
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5 mr-2" />
                  GENERAR REPORTE
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Haz clic para generar el reporte con los filtros seleccionados
            </p>
          </div>

          {/* Botones de descarga */}
          {reportData && (reportData.data || reportData.topClients) && (
            <div className="flex gap-3 mt-4">
              <DownloadButton
                onDownloadPDF={() => handleDownload('pdf')}
                onDownloadExcel={() => {
                  const data = reportData.data ? (reportData.data?.reservations || reportData.data?.roomsBreakdown || []) : [];
                  if (data.length > 0) {
                    // Preparar los datos para Excel basado en el tipo de reporte
                    const fileName = `Reporte_${reportType}_${format(dateRange.from, 'yyyy-MM-dd')}_${format(dateRange.to, 'yyyy-MM-dd')}`;
                    exportToExcel(data, fileName);
                  } else {
                    alert('No hay datos para exportar');
                  }
                }}
                className="flex-1"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visualización de Preview Automático (revenue, occupancy, checkIns) */}
      {reportData && reportData.revenue && !reportData.data && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Vista Previa del Reporte</CardTitle>
            <p className="text-sm text-muted-foreground">
              Análisis de ingresos y ocupación para el período seleccionado
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Validar si hay datos para mostrar */}
            {(reportData.revenue?.total || 0) === 0 && (reportData.checkIns?.total || 0) === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] bg-slate-50 dark:bg-slate-900 rounded-lg border-2 border-dashed border-yellow-300">
                <AlertCircle className="h-16 w-16 text-yellow-500 mb-4" />
                <h3 className="text-lg font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
                  Sin datos para el período seleccionado
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  No se encontraron reservas completadas en el rango de fechas seleccionado.
                  Intenta seleccionar un período diferente o verifica los filtros aplicados.
                </p>
              </div>
            ) : (
              <>
            {/* Tarjetas de resumen */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(reportData.revenue.total || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Ingresos Totales</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-purple-600">
                    {reportData.checkIns.total || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Check-ins</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-orange-600">
                    {reportData.totalGuests || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Total Personas</p>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos */}
            <div className="grid gap-6 md:grid-cols-2" id="custom-reports-charts">
              {/* Gráfico de Barras - Ingresos */}
              {reportData.revenue.data && reportData.revenue.data.length > 0 && (
                <Card id="custom-bar-chart">
                  <CardHeader>
                    <CardTitle>Ingresos por Período</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={reportData.revenue.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => formatCurrency(value)}
                          labelStyle={{ color: '#000' }}
                        />
                        <Legend />
                        <Bar dataKey="total" fill="#10b981" name="Ingresos Totales" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Gráfico Circular - Distribución de Ingresos */}
              {reportData.revenue.data && reportData.revenue.data.length > 0 && (
                <Card id="custom-pie-chart">
                  <CardHeader>
                    <CardTitle>Distribución de Ingresos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { 
                              name: 'Habitaciones', 
                              value: reportData.revenue.data.reduce((sum, item) => sum + (item.roomRevenue || 0), 0) 
                            },
                            { 
                              name: 'Servicios', 
                              value: reportData.revenue.data.reduce((sum, item) => sum + (item.servicesRevenue || 0), 0) 
                            }
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[0, 1].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Botones de descarga para reportes personalizados */}
            {reportData.revenue?.data?.length > 0 && (
              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const pdf = new jsPDF('p', 'mm', 'a4');
                      
                      // Título
                      pdf.setFontSize(20);
                      pdf.setTextColor(66, 133, 244);
                      const reportTitle = reportType === 'room' ? 'Reporte por Habitación' :
                                        reportType === 'roomType' ? 'Reporte por Tipo de Habitación' :
                                        reportType === 'topClients' ? 'Top Clientes' :
                                        reportType === 'byLocation' ? 'Reporte por Ubicación' :
                                        reportType === 'byAge' ? 'Reporte por Edad' :
                                        reportType === 'bySpending' ? 'Reporte por Monto' : 'Reporte Personalizado';
                      pdf.text(reportTitle, 105, 20, { align: 'center' });
                      
                      // Período
                      pdf.setFontSize(12);
                      pdf.setTextColor(100, 100, 100);
                      pdf.text(
                        `Período: ${format(dateRange.from, "d 'de' MMM yyyy", { locale: es })} - ${format(dateRange.to, "d 'de' MMM yyyy", { locale: es })}`,
                        105,
                        30,
                        { align: 'center' }
                      );
                      
                      let yPos = 45;
                      
                      // Resumen
                      pdf.setFontSize(14);
                      pdf.text('Resumen', 20, yPos);
                      yPos += 10;
                      
                      pdf.setFontSize(10);
                      pdf.text(`Ingresos Totales: ${formatCurrency(reportData.revenue?.total || 0)}`, 25, yPos);
                      yPos += 6;
                      pdf.text(`Total Check-ins: ${reportData.checkIns?.total || 0}`, 25, yPos);
                      yPos += 10;
                      
                      // Capturar gráfico de barras
                      const barChartElement = document.getElementById('custom-bar-chart');
                      if (barChartElement) {
                        try {
                          const canvas = await html2canvas(barChartElement, { scale: 2, backgroundColor: '#ffffff' });
                          const imgData = canvas.toDataURL('image/png');
                          const imgWidth = 170;
                          const imgHeight = (canvas.height * imgWidth) / canvas.width;
                          
                          if (yPos + imgHeight > 280) {
                            pdf.addPage();
                            yPos = 20;
                          }
                          
                          pdf.addImage(imgData, 'PNG', 20, yPos, imgWidth, imgHeight);
                          yPos += imgHeight + 10;
                        } catch (error) {
                          console.error('Error al capturar gráfico de barras:', error);
                        }
                      }
                      
                      // Capturar gráfico circular
                      const pieChartElement = document.getElementById('custom-pie-chart');
                      if (pieChartElement) {
                        try {
                          const canvas = await html2canvas(pieChartElement, { scale: 2, backgroundColor: '#ffffff' });
                          const imgData = canvas.toDataURL('image/png');
                          const imgWidth = 170;
                          const imgHeight = (canvas.height * imgWidth) / canvas.width;
                          
                          if (yPos + imgHeight > 280) {
                            pdf.addPage();
                            yPos = 20;
                          }
                          
                          pdf.addImage(imgData, 'PNG', 20, yPos, imgWidth, imgHeight);
                          yPos += imgHeight + 10;
                        } catch (error) {
                          console.error('Error al capturar gráfico circular:', error);
                        }
                      }
                      
                      // Verificar si necesitamos nueva página para la tabla
                      if (yPos > 200) {
                        pdf.addPage();
                        yPos = 20;
                      }
                      
                      // Tabla de datos
                      if (reportData.revenue?.data?.length > 0) {
                        autoTable(pdf, {
                          startY: yPos,
                          head: [['Período', 'Ingresos', 'Check-ins']],
                          body: reportData.revenue.data.map((item, idx) => [
                            item.date, // Ya viene formateado del backend con formato legible
                            formatCurrency(item.total),
                            reportData.checkIns.data[idx]?.count || 0
                          ]),
                          theme: 'grid',
                          headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
                          bodyStyles: { textColor: [0, 0, 0] },
                          margin: { left: 20, right: 20 },
                        });
                      }
                      
                      pdf.save(`${reportTitle.replace(/ /g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
                    } catch (error) {
                      console.error('Error al generar PDF:', error);
                      alert('Error al generar el PDF');
                    }
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Descargar PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    try {
                      const reportTitle = reportType === 'room' ? 'Reporte_por_Habitacion' :
                                        reportType === 'roomType' ? 'Reporte_por_Tipo_Habitacion' :
                                        reportType === 'topClients' ? 'Top_Clientes' :
                                        reportType === 'byLocation' ? 'Reporte_por_Ubicacion' :
                                        reportType === 'byAge' ? 'Reporte_por_Edad' :
                                        reportType === 'bySpending' ? 'Reporte_por_Monto' : 'Reporte_Personalizado';
                      
                      const csvData = reportData.revenue?.data?.map((item, idx) => ({
                        'Período': item.date,
                        'Ingresos Totales': item.total,
                        'Ingresos Habitaciones': item.roomRevenue || 0,
                        'Ingresos Servicios': item.servicesRevenue || 0,
                        'Check-ins': reportData.checkIns.data[idx]?.count || 0
                      })) || [];
                      
                      if (csvData.length > 0) {
                        exportToExcel(csvData, `${reportTitle}_${format(new Date(), 'yyyy-MM-dd')}`);
                      } else {
                        alert('No hay datos para exportar');
                      }
                    } catch (error) {
                      console.error('Error al generar Excel:', error);
                      alert('Error al generar el archivo Excel');
                    }
                  }}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Descargar Excel
                </Button>
              </div>
            )}
            </>
            )}
          </CardContent>
        </Card>
      )}

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

                {/* Validar si hay reservas */}
                {!reportData.data.reservations || reportData.data.reservations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[300px] bg-slate-50 dark:bg-slate-900 rounded-lg border-2 border-dashed border-yellow-300">
                    <AlertCircle className="h-16 w-16 text-yellow-500 mb-4" />
                    <h3 className="text-lg font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
                      Sin datos para el período seleccionado
                    </h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      Este cliente no tiene reservas en el período seleccionado.
                      Intenta seleccionar un período diferente.
                    </p>
                  </div>
                ) : (
                  <>
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
                </>
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
                      <div className="text-2xl font-bold text-blue-600">{reportData.data.summary.totalGuests || 0}</div>
                      <p className="text-xs text-muted-foreground">Personas</p>
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

            {reportType === 'roomType' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Tipo de Habitación: {reportData.data.roomType.name}</h3>
                  <p className="text-sm text-muted-foreground">Total de habitaciones de este tipo: {reportData.data.roomType.totalRooms}</p>
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
                      <div className="text-2xl font-bold text-blue-600">{reportData.data.summary.totalGuests || 0}</div>
                      <p className="text-xs text-muted-foreground">Total Personas</p>
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

                {/* Validar si hay datos */}
                {!reportData.data.topClients || reportData.data.topClients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[300px] bg-slate-50 dark:bg-slate-900 rounded-lg border-2 border-dashed border-yellow-300">
                    <AlertCircle className="h-16 w-16 text-yellow-500 mb-4" />
                    <h3 className="text-lg font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
                      Sin datos para el período seleccionado
                    </h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      No se encontraron clientes con reservas en el período seleccionado.
                      Intenta seleccionar un período diferente.
                    </p>
                  </div>
                ) : (
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
                )}
              </div>
            )}

            {reportType === 'byLocation' && reportData.data && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Reporte de Reservas por País</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedCountry 
                      ? `País seleccionado: ${selectedCountry}` 
                      : `Total de países: ${reportData.data.length}`}
                  </p>
                </div>

                {/* Validar si hay datos */}
                {reportData.data.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[400px] bg-slate-50 dark:bg-slate-900 rounded-lg border-2 border-dashed border-yellow-300">
                    <AlertCircle className="h-16 w-16 text-yellow-500 mb-4" />
                    <h3 className="text-lg font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
                      Sin datos para el período seleccionado
                    </h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      No se encontraron reservas para los criterios seleccionados.
                      Intenta seleccionar un período diferente o verifica los filtros aplicados.
                    </p>
                  </div>
                ) : (
                  <>
                {/* Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfico de Barras */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Reservas por País</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={reportData.data}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="country" angle={-45} textAnchor="end" height={100} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="reservationCount" fill={COLORS[0]} name="Reservas" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Gráfico de Pastel */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Distribución de Ingresos por País</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={reportData.data}
                            dataKey="totalRevenue"
                            nameKey="country"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={(entry) => `${entry.country}: ${formatCurrency(entry.totalRevenue)}`}
                          >
                            {reportData.data.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabla de datos */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">País</th>
                        <th className="text-center p-2">Reservas</th>
                        <th className="text-center p-2">Total Personas</th>
                        <th className="text-right p-2">Ingresos Totales</th>
                        <th className="text-right p-2">Promedio/Reserva</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data.map((item, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-semibold">{item.country}</td>
                          <td className="text-center p-2">{item.reservationCount}</td>
                          <td className="text-center p-2">{item.totalGuests}</td>
                          <td className="text-right p-2 font-semibold text-green-600">{formatCurrency(item.totalRevenue)}</td>
                          <td className="text-right p-2">{formatCurrency(item.totalRevenue / item.reservationCount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
                )}
              </div>
            )}

            {reportType === 'byAge' && reportData.data && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Reporte de Reservas por Rango de Edad</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedAgeRange 
                      ? `Rango seleccionado: ${AGE_RANGES.find(r => r.value === selectedAgeRange)?.label}` 
                      : `Total de rangos: ${reportData.data.length}`}
                  </p>
                </div>

                {/* Validar si hay datos */}
                {reportData.data.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[400px] bg-slate-50 dark:bg-slate-900 rounded-lg border-2 border-dashed border-yellow-300">
                    <AlertCircle className="h-16 w-16 text-yellow-500 mb-4" />
                    <h3 className="text-lg font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
                      Sin datos para el período seleccionado
                    </h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      No se encontraron reservas para los criterios seleccionados.
                      Intenta seleccionar un período diferente o verifica los filtros aplicados.
                    </p>
                  </div>
                ) : (
                  <>
                {/* Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfico de Pastel */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Distribución por Edad</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={reportData.data}
                            dataKey="reservationCount"
                            nameKey="ageRange"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={(entry) => `${entry.ageRange}: ${entry.reservationCount}`}
                          >
                            {reportData.data.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Gráfico de Barras */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Ingresos por Rango de Edad</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={reportData.data}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="ageRange" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                          <Legend />
                          <Bar dataKey="totalRevenue" fill={COLORS[2]} name="Ingresos" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabla de datos */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Rango de Edad</th>
                        <th className="text-center p-2">Reservas</th>
                        <th className="text-center p-2">Total Personas</th>
                        <th className="text-right p-2">Ingresos Totales</th>
                        <th className="text-right p-2">Promedio/Reserva</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data.map((item, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-semibold">{item.ageRange}</td>
                          <td className="text-center p-2">{item.reservationCount}</td>
                          <td className="text-center p-2">{item.totalGuests}</td>
                          <td className="text-right p-2 font-semibold text-green-600">{formatCurrency(item.totalRevenue)}</td>
                          <td className="text-right p-2">{formatCurrency(item.totalRevenue / item.reservationCount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
                )}
              </div>
            )}

            {reportType === 'bySpending' && reportData.data && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Reporte de Reservas por Monto Gastado</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedSpendingRange 
                      ? `Rango seleccionado: ${SPENDING_RANGES.find(r => r.value === selectedSpendingRange)?.label}` 
                      : `Total de rangos: ${reportData.data.length}`}
                  </p>
                </div>

                {/* Validar si hay datos */}
                {reportData.data.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[400px] bg-slate-50 dark:bg-slate-900 rounded-lg border-2 border-dashed border-yellow-300">
                    <AlertCircle className="h-16 w-16 text-yellow-500 mb-4" />
                    <h3 className="text-lg font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
                      Sin datos para el período seleccionado
                    </h3>
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      No se encontraron reservas para los criterios seleccionados.
                      Intenta seleccionar un período diferente o verifica los filtros aplicados.
                    </p>
                  </div>
                ) : (
                  <>
                {/* Gráfico de Barras */}
                <Card>
                  <CardHeader>
                    <CardTitle>Distribución de Reservas por Monto Gastado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={reportData.data} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="spendingRange" type="category" width={120} />
                        <Tooltip 
                          formatter={(value, name) => {
                            if (name === 'Ingresos Totales') return formatCurrency(value);
                            return value;
                          }}
                        />
                        <Legend />
                        <Bar dataKey="reservationCount" fill={COLORS[3]} name="Reservas" />
                        <Bar dataKey="totalRevenue" fill={COLORS[4]} name="Ingresos Totales" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Tabla de datos */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Rango de Gasto</th>
                        <th className="text-center p-2">Reservas</th>
                        <th className="text-center p-2">Total Personas</th>
                        <th className="text-right p-2">Ingresos Totales</th>
                        <th className="text-right p-2">Promedio/Reserva</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.data.map((item, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-semibold">{item.spendingRange}</td>
                          <td className="text-center p-2">{item.reservationCount}</td>
                          <td className="text-center p-2">{item.totalGuests}</td>
                          <td className="text-right p-2 font-semibold text-green-600">{formatCurrency(item.totalRevenue)}</td>
                          <td className="text-right p-2">{formatCurrency(item.totalRevenue / item.reservationCount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Componente de Comparaciones
const ComparisonsSection = () => {
  const [compareType, setCompareType] = useState('periods'); // periods, rooms, roomTypes
  const [dateRange1, setDateRange1] = useState({ from: null, to: null });
  const [dateRange2, setDateRange2] = useState({ from: null, to: null });
  const [compareData, setCompareData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);

  // Cargar habitaciones y tipos al montar
  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar habitaciones
        const roomsRes = await fetch('http://localhost:3001/api/v1/rooms', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        if (roomsRes.ok) {
          const roomsData = await roomsRes.json();
          setRooms(Array.isArray(roomsData) ? roomsData : (roomsData.data || []));
        }

        // Cargar tipos de habitación
        const typesData = await fetchAdminRoomTypes();
        setRoomTypes(typesData || []);
      } catch (error) {
        console.error('Error al cargar datos:', error);
      }
    };
    loadData();
  }, []);

  const getPeriodData = async (from, to) => {
    if (!from || !to) return null;
    
    try {
      const startDate = format(from, 'yyyy-MM-dd');
      const endDate = format(to, 'yyyy-MM-dd');
      const params = new URLSearchParams({ startDate, endDate, groupBy: 'day' });
      
      const [revenueRes, occupancyRes] = await Promise.all([
        fetch(`http://localhost:3001/api/v1/reports/revenue?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`http://localhost:3001/api/v1/reports/occupancy?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })
      ]);
      
      const revenue = await revenueRes.json();
      const occupancy = await occupancyRes.json();
      
      return {
        revenue: revenue.data || [],
        occupancy: occupancy.data || [],
        totalRevenue: (revenue.data || []).reduce((sum, item) => sum + (item.totalRevenue || 0), 0),
        avgOccupancy: (occupancy.data || []).length > 0 
          ? (occupancy.data || []).reduce((sum, item) => sum + (item.occupancyPercentage || 0), 0) / occupancy.data.length
          : 0
      };
    } catch (error) {
      console.error('Error al obtener datos del período:', error);
      return null;
    }
  };

  const handleCompare = async () => {
    if (!dateRange1.from || !dateRange1.to || !dateRange2.from || !dateRange2.to) {
      alert('Por favor selecciona ambos rangos de fechas');
      return;
    }

    setIsLoading(true);
    try {
      const period1Data = await getPeriodData(dateRange1.from, dateRange1.to);
      const period2Data = await getPeriodData(dateRange2.from, dateRange2.to);
      
      setCompareData({
        period1: period1Data,
        period2: period2Data,
        period1Label: `${format(dateRange1.from, 'd MMM', { locale: es })} - ${format(dateRange1.to, 'd MMM yyyy', { locale: es })}`,
        period2Label: `${format(dateRange2.from, 'd MMM', { locale: es })} - ${format(dateRange2.to, 'd MMM yyyy', { locale: es })}`
      });
    } catch (error) {
      console.error('Error al generar comparación:', error);
      alert('Error al generar la comparación');
    } finally {
      setIsLoading(false);
    }
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
          <CardTitle>Comparación de Períodos</CardTitle>
          <p className="text-sm text-muted-foreground">Compara el rendimiento entre dos períodos de tiempo</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Selector de tipo de comparación */}
            <div className="space-y-2">
              <Label>Tipo de Comparación</Label>
              <select
                value={compareType}
                onChange={(e) => setCompareType(e.target.value)}
                className="w-full p-3 border rounded-md bg-background text-foreground"
              >
                <option value="periods">Comparar Períodos</option>
                <option value="rooms" disabled>Comparar Habitaciones (Próximamente)</option>
                <option value="roomTypes" disabled>Comparar Tipos de Habitación (Próximamente)</option>
              </select>
            </div>

            {/* Selectores de fecha */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-lg font-semibold">Primer Período</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange1.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange1.from ? (
                        dateRange1.to ? (
                          <>
                            {format(dateRange1.from, "d 'de' MMM", { locale: es })} -{" "}
                            {format(dateRange1.to, "d 'de' MMM yyyy", { locale: es })}
                          </>
                        ) : (
                          format(dateRange1.from, "d 'de' MMM yyyy", { locale: es })
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
                      defaultMonth={dateRange1.from}
                      selected={dateRange1}
                      onSelect={setDateRange1}
                      numberOfMonths={2}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-lg font-semibold">Segundo Período</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange2.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange2.from ? (
                        dateRange2.to ? (
                          <>
                            {format(dateRange2.from, "d 'de' MMM", { locale: es })} -{" "}
                            {format(dateRange2.to, "d 'de' MMM yyyy", { locale: es })}
                          </>
                        ) : (
                          format(dateRange2.from, "d 'de' MMM yyyy", { locale: es })
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
                      defaultMonth={dateRange2.from}
                      selected={dateRange2}
                      onSelect={setDateRange2}
                      numberOfMonths={2}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Botón de comparar */}
            <Button
              onClick={handleCompare}
              disabled={isLoading || !dateRange1.from || !dateRange1.to || !dateRange2.from || !dateRange2.to}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Comparando...
                </>
              ) : (
                <>
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                  Generar Comparación
                </>
              )}
            </Button>
          </div>

          {/* Resultados de la comparación */}
          {compareData && (
            <div className="mt-8 space-y-6">
              <h3 className="text-xl font-bold">Resultados de la Comparación</h3>
              
              {/* Tarjetas de resumen */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{compareData.period1Label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Ingresos Totales</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(compareData.period1?.totalRevenue || 0)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-purple-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{compareData.period2Label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Ingresos Totales</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(compareData.period2?.totalRevenue || 0)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Diferencias */}
              <Card className="bg-slate-50 dark:bg-slate-900">
                <CardHeader>
                  <CardTitle>Diferencias</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Variación en Ingresos:</span>
                    <span className={cn(
                      "text-lg font-bold",
                      (compareData.period2?.totalRevenue || 0) >= (compareData.period1?.totalRevenue || 0) 
                        ? "text-green-600" 
                        : "text-red-600"
                    )}>
                      {((compareData.period2?.totalRevenue || 0) - (compareData.period1?.totalRevenue || 0)) >= 0 ? '+' : ''}
                      {formatCurrency((compareData.period2?.totalRevenue || 0) - (compareData.period1?.totalRevenue || 0))}
                      {' '}
                      ({((((compareData.period2?.totalRevenue || 0) - (compareData.period1?.totalRevenue || 0)) / (compareData.period1?.totalRevenue || 1)) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Variación en Ocupación:</span>
                    <span className={cn(
                      "text-lg font-bold",
                      (compareData.period2?.avgOccupancy || 0) >= (compareData.period1?.avgOccupancy || 0) 
                        ? "text-green-600" 
                        : "text-red-600"
                    )}>
                      {((compareData.period2?.avgOccupancy || 0) - (compareData.period1?.avgOccupancy || 0)) >= 0 ? '+' : ''}
                      {((compareData.period2?.avgOccupancy || 0) - (compareData.period1?.avgOccupancy || 0)).toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico de comparación */}
              <Card>
                <CardHeader>
                  <CardTitle>Comparación de Ingresos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      {
                        name: compareData.period1Label,
                        ingresos: compareData.period1?.totalRevenue || 0,
                        ocupacion: compareData.period1?.avgOccupancy || 0
                      },
                      {
                        name: compareData.period2Label,
                        ingresos: compareData.period2?.totalRevenue || 0,
                        ocupacion: compareData.period2?.avgOccupancy || 0
                      }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip 
                        formatter={(value, name) => {
                          if (name === 'ingresos') return formatCurrency(value);
                          if (name === 'ocupacion') return `${value.toFixed(1)}%`;
                          return value;
                        }}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="ingresos" fill="#10b981" name="Ingresos" />
                      <Bar yAxisId="right" dataKey="ocupacion" fill="#3b82f6" name="Ocupación %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
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
  const [selectedReportType, setSelectedReportType] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('30days');
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [selectedRoomType, setSelectedRoomType] = useState(null);
  const [channelData, setChannelData] = useState([]);
  const [filterMode, setFilterMode] = useState('calendar'); // 'calendar' o 'rolling'
  const [availableFloors, setAvailableFloors] = useState([]);
  const [isFloorFilterEnabled, setIsFloorFilterEnabled] = useState(true);
  const [isRoomTypeFilterEnabled, setIsRoomTypeFilterEnabled] = useState(true);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [previewReportData, setPreviewReportData] = useState(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [expandedReportType, setExpandedReportType] = useState(null);
  const [selectedCharts, setSelectedCharts] = useState({
    bar: true,
    pie: true,
  });
  const [dashboardData, setDashboardData] = useState({
    weeklyRevenue: [],
    occupancyTrend: [],
    roomTypeStats: [],
    revenueByDay: [],
    monthlyRevenueTotal: 0,
    totalPaidAmount: 0,
  });
  const [clientsData, setClientsData] = useState({
    topClients: [],
    stats: null,
  });
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  
  // Estados para Comparaciones
  const [comparisonType, setComparisonType] = useState('roomTypes'); // roomTypes, clients, rooms
  const [selectedItemsToCompare, setSelectedItemsToCompare] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);
  const [comparisonDateRange, setComparisonDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  const [comparisonSelectedPeriod, setComparisonSelectedPeriod] = useState('30days');
  
  // Estados para rooms y clients (necesarios para Comparaciones)
  const [rooms, setRooms] = useState([]);
  const [clients, setClients] = useState([]);
  
  // Estados para búsqueda de clientes
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [filteredClients, setFilteredClients] = useState([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Cargar datos del dashboard al montar (consolidado para evitar error 429)
  useEffect(() => {
    const loadAllData = async () => {
      setLoadingDashboard(true);
      try {
        await loadDashboardData();
        await loadClientsData();
        await loadRoomsAndClients();
      } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
      } finally {
        setLoadingDashboard(false);
      }
    };
    loadAllData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Usar AYER como fecha final para todos los cálculos
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const endDate = format(yesterday, 'yyyy-MM-dd');
      
      // Para "Ingresos Últimos 30 Días": REALMENTE últimos 30 días desde ayer
      const thirtyDaysAgo = new Date(yesterday);
      thirtyDaysAgo.setDate(yesterday.getDate() - 29); // 30 días total incluyendo ayer
      const monthStartFor30Days = format(thirtyDaysAgo, 'yyyy-MM-dd');

      // Para el resto: desde hace 28 días (ajuste para gráficos semanales)
      const startDate = format(new Date(new Date().setDate(new Date().getDate() - 28)), 'yyyy-MM-dd');

      // Para estadísticas de tipos de habitación: último mes completo
      const today = new Date();
      const monthStart = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd');
      const monthEndDate = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), 'yyyy-MM-dd');

      // Para "Ingresos Diarios Promedio": Últimos 7 días desde AYER
      const weekEndDate = format(yesterday, 'yyyy-MM-dd');
      const weekStartDate7 = new Date(yesterday);
      weekStartDate7.setDate(yesterday.getDate() - 6); // 7 días total incluyendo ayer
      const weekStart = format(weekStartDate7, 'yyyy-MM-dd');

      const [weeklyRev, dailyOcc, dailyRev, roomTypes, monthlyRev, totalPaid] = await Promise.all([
        getWeeklyRevenue(startDate, endDate),
        getDailyOccupancy(weekStart, weekEndDate),
        getDailyRevenue(weekStart, weekEndDate),
        getRoomTypeStats(monthStartFor30Days, endDate).catch(err => {
          console.warn('⚠️ Error al obtener room types, usando datos alternativos:', err);
          // Si falla, devolver estructura vacía
          return { data: [] };
        }),
        getMonthlyRevenue(monthStartFor30Days, endDate),
        getTotalPaidAmount(),
      ]);

      // Procesar ingresos semanales
      const weeklyRevenueData = weeklyRev?.data?.map((item, index) => {
        const periodString = item.period || '';
        let label;
        
        // Si es formato de semana (2025-W41)
        if (periodString.match(/^\d{4}-W\d{1,2}$/)) {
          const [year, week] = periodString.split('-W');
          const weekNum = parseInt(week);
          
          // Calcular fechas de la semana
          const startDate = new Date(year, 0, 1 + (weekNum - 1) * 7);
          while (startDate.getDay() !== 1) startDate.setDate(startDate.getDate() - 1);
          const endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          
          label = `${format(startDate, 'd MMM', { locale: es })} - ${format(endDate, 'd MMM', { locale: es })}`;
        } else {
          // Intentar parsear el periodLabel si existe
          const periodLabel = item.periodLabel || '';
          if (periodLabel) {
            label = periodLabel;
          } else {
            label = `Período ${index + 1}`;
          }
        }
        
        return {
          semana: label,
          ingresos: item.totalRevenue || 0,
        };
      }) || [];

      // Procesar ocupación diaria (últimos 7 días desde ayer)
      // Generar TODOS los días desde weekStartDate7 hasta yesterday, incluso si no hay datos
      const allDays = [];
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(weekStartDate7);
        currentDate.setDate(weekStartDate7.getDate() + i);
        const dayName = dayNames[currentDate.getDay()];
        const dayNumber = currentDate.getDate();
        const periodKey = format(currentDate, 'yyyy-MM-dd');

        // Buscar si hay datos para este día
        const dayData = dailyOcc?.data?.find(item => item.period === periodKey);

        allDays.push({
          dia: `${dayName} ${dayNumber}`,  // Formato: "Lun 14"
          ocupacion: dayData ? (dayData.occupiedRoomNights || 0) : 0,
        });
      }

      const last7Days = allDays;

      // Procesar distribución de tipos de habitación desde el endpoint real
      console.log('📊 Datos crudos de tipos de habitación desde el backend:', roomTypes?.data);
      
      let roomTypeStatsData = roomTypes?.data?.map((item) => ({
        name: item.roomTypeName || item.name || 'Sin nombre',
        value: item.reservationCount || item.value || 0,
      })) || [];
      
      console.log('📊 Datos procesados de tipos de habitación ANTES de agregar faltantes:', roomTypeStatsData);
      
      // FORZAR que existan TODOS los 7 tipos de habitación
      const allRoomTypes = ['Cuádruple', 'Doble adicional', 'Doble dos camas', 'Matrimonial', 'Suite', 'Suite Junior', 'Triple'];
      const existingTypes = roomTypeStatsData.map(item => item.name);
      
      // Agregar tipos faltantes con valor 0
      allRoomTypes.forEach(typeName => {
        if (!existingTypes.includes(typeName)) {
          console.log(`⚠️ Agregando tipo faltante: ${typeName}`);
          roomTypeStatsData.push({ name: typeName, value: 0 });
        }
      });
      
      // Ordenar por cantidad de reservas (descendente) para mostrar los más populares primero
      roomTypeStatsData.sort((a, b) => b.value - a.value);
      
      console.log('📊 Datos FINALES para el gráfico (DEBE HABER 7 TIPOS):', roomTypeStatsData);
      console.log('📊 Total de tipos:', roomTypeStatsData.length);

      // Calcular total de ingresos del mes actual
      const monthlyRevenueTotal = monthlyRev?.data?.reduce((sum, item) => sum + (item.totalRevenue || 0), 0) || 0;
      console.log('💰 Ingresos del mes (últimos 30 días desde ayer):', monthlyRevenueTotal);
      console.log('📊 Datos mensuales recibidos:', monthlyRev);

      // Obtener total de paid_amount
      const totalPaidAmount = totalPaid?.data?.totalPaidAmount || 0;
      console.log('💵 Total pagado efectivo:', totalPaidAmount);

      // Procesar ingresos diarios (últimos 7 días)
      const revenueByDayData = dailyRev?.data?.map((item) => ({
        dia: item.period || item.name || 'N/A',
        ingresos: item.totalRevenue || 0,
      })) || [];

      setDashboardData({
        weeklyRevenue: weeklyRevenueData,
        occupancyTrend: last7Days,
        roomTypeStats: roomTypeStatsData,
        revenueByDay: revenueByDayData,
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
        revenueByDay: [],
        monthlyRevenueTotal: 0,
        totalPaidAmount: 0,
      });
    }
  };

  const loadClientsData = async () => {
    try {
      console.log('📊 Iniciando carga de datos de clientes...');
      
      // Usar últimos 30 días REALES desde ayer
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const thirtyDaysAgo = new Date(yesterday);
      thirtyDaysAgo.setDate(yesterday.getDate() - 29); // 30 días total
      
      const startDate = format(thirtyDaysAgo, 'yyyy-MM-dd');
      const endDate = format(yesterday, 'yyyy-MM-dd');
      
      console.log(`📅 Rango de fechas para clientes: ${startDate} a ${endDate}`);

      // Cargar top 5 clientes desde el endpoint real
      const topClientsResponse = await getTopClients(startDate, endDate, 5);
      console.log('🔍 Respuesta de top clientes:', topClientsResponse);
      const topClientsRaw = topClientsResponse?.data?.ranking || [];

      // Transformar formato del backend al formato esperado por el frontend
      const topClients = Array.isArray(topClientsRaw) ? topClientsRaw.map(client => ({
        name: client.fullName || 'Cliente sin nombre',
        reservations: client.reservationCount || 0,
        revenue: client.totalSpent || 0,
        email: client.email || '',
        userId: client.userId || 0,
      })) : [];
      
      console.log(`✅ Top ${topClients.length} clientes procesados:`, topClients);

      // Cargar estadísticas de clientes desde el endpoint real
      const statsResponse = await getClientStats(startDate, endDate);
      console.log('📈 Respuesta de estadísticas:', statsResponse);
      const statsRaw = statsResponse?.data || {};

      const stats = {
        totalClients: statsRaw.totalClients || 0,
        newClients: statsRaw.newClients || 0,
        recurringClients: statsRaw.recurringClients || 0,
        segmentation: statsRaw.segmentation || [],
      };
      
      console.log('✅ Estadísticas procesadas:', stats);

      setClientsData({
        topClients,
        stats,
      });
    } catch (error) {
      console.error('❌ Error al cargar datos de clientes:', error);
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

  // Cargar habitaciones y clientes para usar en Comparaciones
  const loadRoomsAndClients = async () => {
    try {
      // Cargar habitaciones
      const roomsResponse = await fetch('http://localhost:3001/api/v1/admin/rooms', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (roomsResponse.ok) {
        const roomsData = await roomsResponse.json();
        const rawData = Array.isArray(roomsData) ? roomsData : (roomsData.data || []);
        const roomsList = rawData
          .filter(r => r.is_active !== false)
          .map(r => ({
            id: r.id,
            roomNumber: r.room_number || 'S/N',
            type: r.room_types?.name || 'Sin tipo',
            floor: r.floor
          }));
        setRooms(roomsList);
        console.log('✅ Habitaciones cargadas para Comparaciones:', roomsList.length);
      }

      // Cargar clientes
      const clientsResponse = await fetch('http://localhost:3001/api/v1/guests?limit=500', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (clientsResponse.ok) {
        const clientsData = await clientsResponse.json();
        const allGuests = clientsData.data || [];
        const clientsList = allGuests.map(c => ({
          id: c.id,
          name: c.fullName || c.full_name || 'Sin nombre',
          email: c.email || '',
          rut: c.rut || c.guest_details?.rut || '',
          passport: c.passport || c.guest_details?.passport || ''
        }));
        setClients(clientsList);
        console.log('✅ Clientes cargados para Comparaciones:', clientsList.length);
      }
    } catch (error) {
      console.error('Error al cargar rooms y clients para Comparaciones:', error);
    }
  };

  // Función para filtrar clientes por RUT, pasaporte o nombre
  const filterClientsBySearch = (query) => {
    if (!query || query.trim().length < 2) {
      setFilteredClients([]);
      setShowClientDropdown(false);
      return;
    }

    const searchQuery = query.toLowerCase().trim();
    const filtered = clients.filter(client => {
      const nameMatch = client.name?.toLowerCase().includes(searchQuery);
      const rutMatch = client.rut?.toLowerCase().includes(searchQuery);
      const passportMatch = client.passport?.toLowerCase().includes(searchQuery);
      const emailMatch = client.email?.toLowerCase().includes(searchQuery);
      
      return nameMatch || rutMatch || passportMatch || emailMatch;
    });

    setFilteredClients(filtered.slice(0, 20)); // Máximo 20 resultados
    setShowClientDropdown(filtered.length > 0);
  };

  // Función para toggle selección de cliente
  const toggleClientSelection = (clientId) => {
    setSelectedItemsToCompare(prev => {
      if (prev.includes(clientId)) {
        return prev.filter(id => id !== clientId);
      } else {
        return [...prev, clientId];
      }
    });
    setClientSearchQuery('');
    setShowClientDropdown(false);
  };

  // Función para procesar datos de reportes
  const processReportData = (revenueData, occupancyData) => {
    const revenueArray = revenueData?.data || [];
    const occupancyArray = occupancyData?.data || [];

    console.log('🔍 [Dashboard] Procesando datos - primer item de revenue:', revenueArray[0]);
    console.log('🔍 [Dashboard] Procesando datos - primer item de occupancy:', occupancyArray[0]);

    const processedRevenue = {
      data: revenueArray.map(item => ({
        date: item.period || item.periodLabel || item.dia || item.semana || item.mes || item.date,
        period: item.period,
        total: item.totalRevenue || item.totalAmount || item.ingresos || item.value || 0,
        roomRevenue: item.roomRevenue || 0,
        servicesRevenue: item.servicesRevenue || 0,
      })),
      total: revenueArray.reduce((sum, item) => sum + (item.totalRevenue || item.totalAmount || item.ingresos || item.value || 0), 0),
      count: revenueArray.reduce((sum, item) => sum + (item.reservationCount || item.count || item.reservas || 0), 0),
    };

    console.log('💰 [Dashboard] Total de ingresos calculado:', processedRevenue.total);
    console.log('📊 [Dashboard] Primer período procesado:', processedRevenue.data[0]);

    const processedOccupancy = {
      data: occupancyArray.map(item => ({
        date: item.period || item.periodLabel,
        period: item.period,
        percentage: item.occupancyPercentage || 0,
        occupiedNights: item.occupiedRoomNights || 0,
        availableNights: item.availableRoomNights || 0,
        totalGuests: item.totalGuests || 0,
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

    const totalGuests = occupancyArray.reduce((sum, item) => sum + (item.totalGuests || 0), 0);

    return {
      revenue: processedRevenue,
      occupancy: processedOccupancy,
      checkIns: processedCheckIns,
      totalGuests,
    };
  };

  // Generar preview automático del reporte
  const handleGenerateReport = async (rangeType, mode = filterMode) => {
    setIsLoading(true);
    setSelectedReportType(rangeType);
    
    // Incluir los filtros en los parámetros
    const filters = {
      ...(selectedFloor ? { floor: parseInt(selectedFloor) } : {}),
      ...(selectedRoomType ? { roomTypeId: selectedRoomType } : {})
    };

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
          // Mes ACTUAL (día 1 hasta ayer)
          from = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0);
          to = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
          break;

        case 'Trimestral':
          // Trimestre actual (Q1: Ene-Mar, Q2: Abr-Jun, Q3: Jul-Sep, Q4: Oct-Dic) hasta ayer
          const currentQuarter = Math.floor(today.getMonth() / 3);
          const quarterStartMonth = currentQuarter * 3;
          from = new Date(today.getFullYear(), quarterStartMonth, 1, 0, 0, 0);
          to = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
          break;

        case 'Anual':
          // Año ACTUAL completo (1 enero hasta hoy)
          from = new Date(today.getFullYear(), 0, 1, 0, 0, 0);
          to = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
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
          // Últimos 30 días (desde hace 29 días más ayer = 30 días totales)
          const thirtyDaysAgo = new Date(yesterday);
          thirtyDaysAgo.setDate(yesterday.getDate() - 29); // Correctamente ya resta 29 para tener 30 días
          from = new Date(thirtyDaysAgo.getFullYear(), thirtyDaysAgo.getMonth(), thirtyDaysAgo.getDate(), 0, 0, 0);
          to = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
          break;

        case 'Trimestral':
          // Últimos 90 días (desde hace 89 días más ayer = 90 días totales)
          const ninetyDaysAgo = new Date(yesterday);
          ninetyDaysAgo.setDate(yesterday.getDate() - 89); // Correctamente ya resta 89 para tener 90 días
          from = new Date(ninetyDaysAgo.getFullYear(), ninetyDaysAgo.getMonth(), ninetyDaysAgo.getDate(), 0, 0, 0);
          to = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
          break;

        case 'Anual':
          // Últimos 365 días (desde hace 364 días más ayer = 365 días totales)
          const threeHundredSixtyFiveDaysAgo = new Date(yesterday);
          threeHundredSixtyFiveDaysAgo.setDate(yesterday.getDate() - 364); // Resta 364 para tener 365 días totales
          from = new Date(threeHundredSixtyFiveDaysAgo.getFullYear(), threeHundredSixtyFiveDaysAgo.getMonth(), threeHundredSixtyFiveDaysAgo.getDate(), 0, 0, 0);
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
          // Para el reporte anual, usamos los últimos 365 días
          [revenue, occupancy] = await Promise.all([
            getMonthlyRevenue(startDate, endDate),
            getMonthlyOccupancy(startDate, endDate),
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
      setShowReportPreview(true); // ✅ MOSTRAR LA PREVISUALIZACIÓN
      console.log('👁️ Previsualización activada - debería mostrarse abajo');
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
      // NO abrir modal - el reporte se muestra hacia abajo
    } catch (err) {
      console.error('Error al obtener reportes personalizados:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para determinar automáticamente el tipo de reporte según el rango de fechas
  const getIntelligentReportType = (fromDate, toDate) => {
    const days = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));

    if (days <= 1) {
      return 'Diario';
    } else if (days <= 7) {
      return 'Semanal';
    } else if (days <= 31) {
      return 'Mensual';
    } else if (days <= 90) {
      return 'Trimestral';
    } else {
      return 'Anual';
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Función para manejar períodos rápidos (estilo Planning)
  const handleQuickPeriod = async (period) => {
    // Usar AYER como fecha final porque hoy no tiene datos completos
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    let from, to = new Date(yesterday);

    switch (period) {
      case 'today':
        from = new Date(yesterday); // Mostrar datos de ayer
        break;
      case '7days':
        from = new Date(yesterday);
        from.setDate(yesterday.getDate() - 6); // 7 días total incluyendo ayer
        break;
      case '14days':
        from = new Date(yesterday);
        from.setDate(yesterday.getDate() - 13);
        break;
      case '30days':
        from = new Date(yesterday);
        from.setDate(yesterday.getDate() - 29);
        break;
      case '90days':
        from = new Date(yesterday);
        from.setDate(yesterday.getDate() - 89);
        break;
      case '365days':
        from = new Date(yesterday);
        from.setDate(yesterday.getDate() - 364);
        break;
      default:
        from = new Date(yesterday);
        from.setDate(yesterday.getDate() - 29);
    }

    setDateRange({ from, to });
    setSelectedPeriod(period);

    // Auto-generar reporte con tipo inteligente
    const reportType = getIntelligentReportType(from, to);
    await handleGenerateReport(reportType, 'rolling');
  };

  // Descargar gráfico como PDF
  const downloadChartPDF = async (chartName, data) => {
    try {
      const pdf = new jsPDF();
      pdf.setFontSize(16);
      pdf.text(`Reporte: ${chartName}`, 20, 20);

      pdf.setFontSize(10);
      pdf.text(`Fecha: ${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`, 20, 30);

      // Añadir tabla con datos
      const tableData = data.map(item => [
        item.name || item.semana || item.dia || item.period || item.periodLabel,
        formatCurrency(item.ingresos || item.value || item.totalRevenue || 0)
      ]);

      autoTable(pdf, {
        startY: 40,
        head: [['Período', 'Ingresos']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] },
      });

      pdf.save(`${chartName}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el PDF');
    }
  };

  // Descargar gráfico como CSV
  const downloadChartExcel = (chartName, data) => {
    try {
      const csvData = data.map(item => ({
        'Período': item.name || item.semana || item.dia || item.period || item.periodLabel,
        'Ingresos': item.ingresos || item.value || item.totalRevenue || 0,
        'Ocupación': item.ocupacion || item.percentage || 0,
      }));

      exportToExcel(csvData, `${chartName}_${format(new Date(), 'yyyy-MM-dd')}`);
    } catch (error) {
      console.error('Error al generar CSV:', error);
      alert('Error al generar el archivo CSV');
    }
  };

  // Descargar datos de canal como PDF
  const downloadChannelDataPDF = async () => {
    try {
      const pdf = new jsPDF();
      pdf.setFontSize(16);
      pdf.text('Reservas por Canal de Origen', 20, 20);

      pdf.setFontSize(10);
      pdf.text(`Fecha de generación: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, 30);

      const total = channelData.reduce((sum, c) => sum + c.value, 0);
      const tableData = channelData.map(item => [
        item.name,
        item.value.toString(),
        `${((item.value / total) * 100).toFixed(1)}%`
      ]);

      autoTable(pdf, {
        startY: 40,
        head: [['Canal', 'Cantidad', 'Porcentaje']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
      });

      pdf.save(`Reservas_por_Canal_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el PDF');
    }
  };

  // Descargar datos de canal como CSV
  const downloadChannelDataExcel = () => {
    try {
      const total = channelData.reduce((sum, c) => sum + c.value, 0);
      const csvData = channelData.map(item => ({
        'Canal': item.name,
        'Cantidad': item.value,
        'Porcentaje': `${((item.value / total) * 100).toFixed(1)}%`
      }));

      exportToExcel(csvData, `Reservas_por_Canal_${format(new Date(), 'yyyy-MM-dd')}`);
    } catch (error) {
      console.error('Error al generar CSV:', error);
      alert('Error al generar el archivo CSV');
    }
  };

  // Generar comparaciones entre entidades seleccionadas
  const generateComparison = async () => {
    if (selectedItemsToCompare.length < 2) {
      alert('Debes seleccionar al menos 2 elementos para comparar');
      return;
    }

    setIsLoadingComparison(true);
    try {
      const startDate = format(comparisonDateRange.from, 'yyyy-MM-dd');
      const endDate = format(comparisonDateRange.to, 'yyyy-MM-dd');

      console.log('🔍 Generando comparación:');
      console.log('  - Tipo:', comparisonType);
      console.log('  - Items seleccionados:', selectedItemsToCompare);
      console.log('  - Rango de fechas:', startDate, 'a', endDate);

      let comparisonResults = [];

      // Según el tipo de comparación, obtener datos para cada elemento
      for (const itemId of selectedItemsToCompare) {
        let itemData = null;
        let itemName = '';

        if (comparisonType === 'roomTypes') {
          const type = roomTypes.find(rt => rt.id === parseInt(itemId));
          itemName = type?.name || `Tipo ${itemId}`;
          
          const params = new URLSearchParams({
            startDate,
            endDate,
            roomTypeId: itemId,
            groupBy: 'month'
          });

          const [revenueRes, occupancyRes] = await Promise.all([
            fetch(`http://localhost:3001/api/v1/reports/revenue?${params.toString()}`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            }),
            fetch(`http://localhost:3001/api/v1/reports/occupancy?${params.toString()}`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
          ]);

          const revenue = await revenueRes.json();
          const occupancy = await occupancyRes.json();

          console.log(`  📊 Datos de tipo "${itemName}":`, {
            revenue: revenue.data,
            occupancy: occupancy.data
          });

          // Calcular totales con los nombres correctos de las propiedades
          const totalRevenue = revenue.data?.reduce((sum, r) => sum + (r.totalRevenue || r.totalAmount || 0), 0) || 0;
          const totalReservations = revenue.data?.reduce((sum, r) => sum + (r.reservationCount || r.count || 0), 0) || 0;
          const totalGuests = occupancy.data?.reduce((sum, o) => sum + (o.totalGuests || 0), 0) || 0;
          const avgOccupancy = occupancy.data?.length > 0
            ? occupancy.data.reduce((sum, o) => sum + (o.occupancyPercentage || o.occupancyRate || 0), 0) / occupancy.data.length
            : 0;

          console.log(`  💰 Totales calculados:`, {
            totalRevenue,
            totalReservations,
            totalGuests,
            avgOccupancy
          });

          itemData = {
            id: itemId,
            name: itemName,
            totalRevenue,
            avgOccupancy,
            totalReservations,
            totalGuests,
            revenueData: revenue.data || [],
            occupancyData: occupancy.data || []
          };
        } else if (comparisonType === 'rooms') {
          const room = rooms.find(r => r.id === parseInt(itemId));
          itemName = `Habitación ${room?.roomNumber}`;

          const params = new URLSearchParams({
            startDate,
            endDate,
            roomId: itemId,
            groupBy: 'month'
          });

          const [revenueRes, occupancyRes] = await Promise.all([
            fetch(`http://localhost:3001/api/v1/reports/revenue?${params.toString()}`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            }),
            fetch(`http://localhost:3001/api/v1/reports/occupancy?${params.toString()}`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
          ]);

          const revenue = await revenueRes.json();
          const occupancy = await occupancyRes.json();

          console.log(`  🏨 Datos de habitación "${itemName}":`, {
            revenue: revenue.data,
            occupancy: occupancy.data
          });

          // Calcular totales con los nombres correctos de las propiedades
          const totalRevenue = revenue.data?.reduce((sum, r) => sum + (r.totalRevenue || r.totalAmount || 0), 0) || 0;
          const totalReservations = revenue.data?.reduce((sum, r) => sum + (r.reservationCount || r.count || 0), 0) || 0;
          const totalGuests = occupancy.data?.reduce((sum, o) => sum + (o.totalGuests || 0), 0) || 0;
          const avgOccupancy = occupancy.data?.length > 0
            ? occupancy.data.reduce((sum, o) => sum + (o.occupancyPercentage || o.occupancyRate || 0), 0) / occupancy.data.length
            : 0;

          console.log(`  💰 Totales calculados:`, {
            totalRevenue,
            totalReservations,
            totalGuests,
            avgOccupancy
          });

          itemData = {
            id: itemId,
            name: itemName,
            totalRevenue,
            avgOccupancy,
            totalReservations,
            totalGuests,
            revenueData: revenue.data || [],
            occupancyData: occupancy.data || []
          };
        }

        // Siempre agregar el item, incluso si no tiene datos
        if (itemData) {
          // Marcar como "sin datos" si no tiene ingresos ni reservas
          if (itemData.totalRevenue === 0 && itemData.totalReservations === 0) {
            itemData.noData = true;
          }
          comparisonResults.push(itemData);
        }
      }

      console.log('✅ Comparación completa:', comparisonResults);
      setComparisonData(comparisonResults);
    } catch (error) {
      console.error('❌ Error al generar comparación:', error);
      alert('Error al generar la comparación');
    } finally {
      setIsLoadingComparison(false);
    }
  };

  // Manejar cambio rápido de período para Comparaciones
  const handleComparisonQuickPeriod = (period) => {
    const today = new Date();
    let from, to = new Date(today);

    switch (period) {
      case 'today':
        from = new Date(today);
        break;
      case '7days':
        from = new Date(today);
        from.setDate(today.getDate() - 6); // 7 días total incluyendo hoy
        break;
      case '14days':
        from = new Date(today);
        from.setDate(today.getDate() - 13);
        break;
      case '30days':
        from = new Date(today);
        from.setDate(today.getDate() - 29);
        break;
      case '90days':
        from = new Date(today);
        from.setDate(today.getDate() - 89); // 90 días incluyendo hoy
        break;
      case '365days':
        from = new Date(today);
        from.setDate(today.getDate() - 364); // 365 días incluyendo hoy
        break;
      default:
        from = new Date(today);
        from.setDate(today.getDate() - 29);
    }

    setComparisonDateRange({ from, to });
    setComparisonSelectedPeriod(period);
  };

  // Exportar comparación a PDF
  const exportComparisonPDF = () => {
    if (!comparisonData || comparisonData.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Título
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Reporte Comparativo', pageWidth / 2, 20, { align: 'center' });

    // Subtítulo
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(
      `${format(comparisonDateRange.from, 'd MMM yyyy', { locale: es })} - ${format(comparisonDateRange.to, 'd MMM yyyy', { locale: es })}`,
      pageWidth / 2,
      28,
      { align: 'center' }
    );

    // Tipo de comparación
    const comparisonTypeLabels = {
      roomTypes: 'Tipos de Habitación',
      rooms: 'Habitaciones',
      clients: 'Clientes'
    };
    doc.text(
      `Comparando: ${comparisonTypeLabels[comparisonType]}`,
      pageWidth / 2,
      36,
      { align: 'center' }
    );

    // Tabla de datos
    const tableData = comparisonData.map(item => [
      item.name,
      formatCurrency(item.totalRevenue),
      item.totalReservations,
      comparisonType !== 'clients' ? (item.totalGuests || 0) : 'N/A'
    ]);

    doc.autoTable({
      startY: 45,
      head: [['Nombre', 'Ingresos Totales', 'Reservas', 'Total Personas']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: 'bold' },
    });

    // Guardar
    doc.save(`comparacion_${comparisonType}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  // Exportar comparación a Excel
  const exportComparisonExcel = () => {
    if (!comparisonData || comparisonData.length === 0) return;

    const excelData = comparisonData.map(item => ({
      'Nombre': item.name,
      'Ingresos Totales': item.totalRevenue,
      'Reservas': item.totalReservations,
      'Personas': comparisonType !== 'clients' ? (item.totalGuests || 0) : 'N/A'
    }));

    exportToExcel(excelData, `comparacion_${comparisonType}_${format(new Date(), 'yyyy-MM-dd')}`);
  };

  // Cargar tipos de habitación
  useEffect(() => {
    const loadRoomTypes = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/v1/admin/rooms/room-types?isActive=true', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('🏨 Tipos de habitación cargados en Dashboard:', data);
          // El backend puede devolver el array directamente o en { data: [...] }
          const types = Array.isArray(data) ? data : (data.data || []);
          console.log('✅ Tipos procesados:', types);
          setRoomTypes(types);
        } else {
          console.error('❌ Error al cargar tipos de habitación:', response.status);
        }
      } catch (error) {
        console.error('❌ Error al cargar tipos de habitación:', error);
      }
    };

    loadRoomTypes();
  }, []);

  // Cargar pisos disponibles dinámicamente
  useEffect(() => {
    const loadAvailableFloors = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/v1/admin/rooms', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const rooms = Array.isArray(data) ? data : (data.data || []);
          // Extraer pisos únicos y ordenarlos
          const floors = [...new Set(rooms.map(room => room.floor))].filter(f => f != null).sort((a, b) => a - b);
          setAvailableFloors(floors);
        }
      } catch (error) {
        console.error('Error al cargar pisos:', error);
      }
    };

    loadAvailableFloors();
  }, []);

  // ==================== WEBSOCKET PARA ACTUALIZACIÓN EN TIEMPO REAL ====================
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !socketService.isConnected()) {
      socketService.connect(token);
    }

    // Escuchar eventos de actualización de reportes
    const handleReportUpdate = (data) => {
      console.log('🔄 Actualización de reporte recibida:', data);
      // Recargar datos del dashboard
      loadDashboardData();
      loadClientsData();
      // Si hay un reporte generado, regenerarlo
      if (reportData) {
        handleGenerateReport();
      }
    };

    // Registrar listener personalizado para reportes
    if (socketService.socket) {
      socketService.socket.on('reports:update', handleReportUpdate);
      socketService.socket.on('reservation:created', handleReportUpdate);
      socketService.socket.on('reservation:updated', handleReportUpdate);
      socketService.socket.on('reservation:deleted', handleReportUpdate);
    }

    return () => {
      // Limpiar listeners al desmontar
      if (socketService.socket) {
        socketService.socket.off('reports:update', handleReportUpdate);
        socketService.socket.off('reservation:created', handleReportUpdate);
        socketService.socket.off('reservation:updated', handleReportUpdate);
        socketService.socket.off('reservation:deleted', handleReportUpdate);
      }
    };
  }, [reportData]);

  // Cargar datos de canal (usando datos de ejemplo mientras se implementa el endpoint)
  useEffect(() => {
    const loadChannelData = async () => {
      // Usar datos de ejemplo mientras se implementa el endpoint real
      const mockChannels = [
        { name: 'ChatBot/WhatsApp', value: 31, color: COLORS[0] },
        { name: 'Web', value: 25, color: COLORS[1] },
        { name: 'Presencial', value: 20, color: COLORS[2] },
        { name: 'Telefónico', value: 15, color: COLORS[3] },
        { name: 'Walk-in', value: 9, color: COLORS[4] },
      ];
      setChannelData(mockChannels);
    };

    loadChannelData();
  }, []);

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Reportes y Estadísticas</h1>
        <p className="text-muted-foreground">
          Visualiza y analiza los datos de tu hotel de forma completa
        </p>
      </div>

      <Tabs defaultValue="custom" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
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
          <TabsTrigger value="comparisons" className="gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            <span className="hidden sm:inline">Comparaciones</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
          {/* KPI de Ingresos Totales (Ancho completo) */}
          <Card className="border-green-200 dark:border-green-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-bold">Ingresos Totales</CardTitle>
              <DollarSign className="h-6 w-6 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600">
                {loadingDashboard ? 'Cargando...' : formatCurrency(
                  dashboardData.totalPaidAmount || 0
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Últimos 30 Días</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {loadingDashboard ? 'Cargando...' : formatCurrency(
                    dashboardData.monthlyRevenueTotal || 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {(() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const monthStart = new Date(yesterday);
                    monthStart.setDate(yesterday.getDate() - 29);
                    return `${format(monthStart, 'dd/MM')} - ${format(yesterday, 'dd/MM/yyyy')}`;
                  })()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Promedio Ingresos Diarios</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {loadingDashboard ? 'Cargando...' : formatCurrency(
                    (dashboardData.revenueByDay && dashboardData.revenueByDay.length > 0)
                      ? dashboardData.revenueByDay.reduce((sum, day) => sum + (day.ingresos || 0), 0) / dashboardData.revenueByDay.length
                      : 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {(() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const weekStart = new Date(yesterday);
                    weekStart.setDate(yesterday.getDate() - 6);
                    return `${format(weekStart, 'dd/MM')} - ${format(yesterday, 'dd/MM/yyyy')}`;
                  })()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes</CardTitle>
                <Users className="h-4 w-4 text-cyan-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-cyan-600">
                  {clientsData.stats?.totalClients || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes Nuevos Últimos 30 Días</CardTitle>
                <Users className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {clientsData.stats?.newClients || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {(() => {
                    const today = new Date();
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(today.getDate() - 30);
                    return `${format(thirtyDaysAgo, "dd/MM/yyyy")} - ${format(today, "dd/MM/yyyy")}`;
                  })()}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Generar Reportes Personalizados</CardTitle>
              <p className="text-sm text-muted-foreground">
                Selecciona el período y opciones para generar tu reporte
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Filtros estilo Planning */}
                <div className="flex flex-wrap items-center gap-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                  {/* Navegación de Semana */}
                  <div className="flex items-center gap-1 border-r pr-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        const newFrom = new Date(dateRange.from);
                        newFrom.setDate(newFrom.getDate() - 7);
                        const newTo = new Date(dateRange.to);
                        newTo.setDate(newTo.getDate() - 7);
                        setDateRange({ from: newFrom, to: newTo });
                      }}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </Button>
                    <span className="text-sm font-medium px-2">Semana</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        const newFrom = new Date(dateRange.from);
                        newFrom.setDate(newFrom.getDate() + 7);
                        const newTo = new Date(dateRange.to);
                        newTo.setDate(newTo.getDate() + 7);
                        setDateRange({ from: newFrom, to: newTo });
                      }}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </div>

                  {/* Botones de Período Rápido */}
                  <Button
                    variant={selectedPeriod === 'today' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      handleQuickPeriod('today');
                      setIsFloorFilterEnabled(true);
                    }}
                    className="h-8"
                  >
                    Hoy
                  </Button>

                  <Button
                    variant={selectedPeriod === '7days' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      handleQuickPeriod('7days');
                      setIsFloorFilterEnabled(true);
                    }}
                    className="h-8"
                  >
                    7 días
                  </Button>

                  <Button
                    variant={selectedPeriod === '14days' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      handleQuickPeriod('14days');
                      setIsFloorFilterEnabled(true);
                    }}
                    className="h-8"
                  >
                    14 días
                  </Button>

                  <Button
                    variant={selectedPeriod === '30days' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      handleQuickPeriod('30days');
                      setIsFloorFilterEnabled(true);
                    }}
                    className="h-8"
                  >
                    30 días
                  </Button>

                  <Button
                    variant={selectedPeriod === '90days' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      handleQuickPeriod('90days');
                      setIsFloorFilterEnabled(true);
                    }}
                    className="h-8"
                  >
                    Trimestre
                  </Button>

                  <Button
                    variant={selectedPeriod === '365days' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      handleQuickPeriod('365days');
                      setIsFloorFilterEnabled(true);
                    }}
                    className="h-8"
                  >
                    Anual
                  </Button>

                  <div className="border-l h-8 mx-2"></div>

                  {/* Calendarios de Fecha */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? format(dateRange.from, "d 'de' MMM yyyy", { locale: es }) : 'Inicio'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={async (date) => {
                          if (date) {
                            const newRange = { ...dateRange, from: date };
                            setDateRange(newRange);
                            setSelectedPeriod('custom');
                            setIsFloorFilterEnabled(true);
                            // Generar reporte automáticamente si ambas fechas están seleccionadas
                            if (newRange.to) {
                              const days = Math.ceil((newRange.to - date) / (1000 * 60 * 60 * 24));
                              let reportType = 'Mensual';
                              if (days <= 1) reportType = 'Diario';
                              else if (days <= 7) reportType = 'Semanal';
                              else if (days <= 31) reportType = 'Mensual';
                              else if (days <= 90) reportType = 'Trimestral';
                              else reportType = 'Anual';
                              await handleGenerateReport(reportType, 'calendar');
                            }
                          }
                        }}
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.to ? format(dateRange.to, "d 'de' MMM yyyy", { locale: es }) : 'Fin'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={async (date) => {
                          if (date) {
                            const newRange = { ...dateRange, to: date };
                            setDateRange(newRange);
                            setSelectedPeriod('custom');
                            setIsFloorFilterEnabled(true);
                            // Generar reporte automáticamente si ambas fechas están seleccionadas
                            if (newRange.from) {
                              const days = Math.ceil((date - newRange.from) / (1000 * 60 * 60 * 24));
                              let reportType = 'Mensual';
                              if (days <= 1) reportType = 'Diario';
                              else if (days <= 7) reportType = 'Semanal';
                              else if (days <= 31) reportType = 'Mensual';
                              else if (days <= 90) reportType = 'Trimestral';
                              else reportType = 'Anual';
                              await handleGenerateReport(reportType, 'calendar');
                            }
                          }
                        }}
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Filtros Progresivos con Dropdowns */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Filtro de Piso */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Filtrar por Piso
                      {!isFloorFilterEnabled && (
                        <span className="ml-2 text-xs text-muted-foreground">(Selecciona primero una fecha)</span>
                      )}
                    </Label>
                    <select
                      disabled={!isFloorFilterEnabled}
                      value={selectedFloor || ''}
                      onChange={(e) => {
                        const value = e.target.value ? parseInt(e.target.value) : null;
                        setSelectedFloor(value);
                        // Habilitar el filtro de tipo incluso cuando se selecciona "Todos los Pisos"
                        setIsRoomTypeFilterEnabled(true);
                      }}
                      className={cn(
                        "w-full p-3 border rounded-md bg-background text-foreground",
                        !isFloorFilterEnabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <option value="">Todos los Pisos</option>
                      {availableFloors.map((floor) => (
                        <option key={floor} value={floor}>
                          Piso {floor}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro de Tipo de Habitación */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Tipo de Habitación
                      {!isRoomTypeFilterEnabled && (
                        <span className="ml-2 text-xs text-muted-foreground">(Selecciona un rango de fecha primero)</span>
                      )}
                    </Label>
                    <select
                      disabled={!isRoomTypeFilterEnabled}
                      value={selectedRoomType || ''}
                      onChange={(e) => {
                        const value = e.target.value ? parseInt(e.target.value) : null;
                        setSelectedRoomType(value);
                      }}
                      className={cn(
                        "w-full p-3 border rounded-md bg-background text-foreground",
                        !isRoomTypeFilterEnabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <option value="">Todos los Tipos</option>
                      {roomTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Auto-genera reporte al cambiar filtros */}

                {/* Estado de los filtros */}
                {(selectedFloor || selectedRoomType) && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Filtros activos:</p>
                    <ul className="mt-1 space-y-1 text-xs text-blue-700 dark:text-blue-200">
                      {selectedFloor && (
                        <li>• Piso {selectedFloor}</li>
                      )}
                      {selectedRoomType && (
                        <li>• Tipo: {roomTypes.find(t => t.id === selectedRoomType)?.name}</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* BOTÓN PARA GENERAR REPORTE */}
                <div className="mt-6">
                  <Button
                    onClick={async () => {
                      setIsGeneratingPreview(true);
                      setShowReportPreview(true);
                      try {
                        // Determinar el tipo de reporte según el rango de fechas
                        const days = Math.ceil((dateRange.to - dateRange.from) / (1000 * 60 * 60 * 24));
                        let reportType = 'Mensual'; // Por defecto
                        
                        if (days <= 1) reportType = 'Diario';
                        else if (days <= 7) reportType = 'Semanal';
                        else if (days <= 31) reportType = 'Mensual';
                        else if (days <= 90) reportType = 'Trimestral';
                        else reportType = 'Anual';
                        
                        await handleGenerateReport(reportType, 'calendar');
                      } catch (error) {
                        console.error('Error al generar reporte:', error);
                      } finally {
                        setIsGeneratingPreview(false);
                      }
                    }}
                    disabled={!dateRange.from || !dateRange.to || isGeneratingPreview}
                    className="w-full"
                  >
                    {isGeneratingPreview ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                        Generando Reporte...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Generar Reporte
                      </>
                    )}
                  </Button>
                </div>

                {/* Preview del Reporte - Visible siempre que haya fechas seleccionadas */}
                {showReportPreview && (
                  <div className="mt-6 border-t pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold">Previsualización del Reporte</h3>
                        <p className="text-sm text-muted-foreground">
                          {dateRange.from && dateRange.to && 
                            `${format(dateRange.from, "d 'de' MMM yyyy", { locale: es })} - ${format(dateRange.to, "d 'de' MMM yyyy", { locale: es })}`
                          }
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCharts(prev => ({ ...prev, bar: !prev.bar }));
                          }}
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          {selectedCharts.bar ? 'Ocultar' : 'Mostrar'} Barras
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCharts(prev => ({ ...prev, pie: !prev.pie }));
                          }}
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          {selectedCharts.pie ? 'Ocultar' : 'Mostrar'} Circular
                        </Button>
                      </div>
                    </div>

                    {isGeneratingPreview ? (
                      <div className="flex items-center justify-center h-[400px] bg-slate-50 dark:bg-slate-900 rounded-lg">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
                          <p className="text-sm text-muted-foreground">Generando reporte...</p>
                        </div>
                      </div>
                    ) : (previewReportData || reportData) ? (
                      // Validar si hay datos para mostrar
                      ((previewReportData || reportData).revenue?.total || 0) === 0 && 
                      ((previewReportData || reportData).checkIns?.total || 0) === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[400px] bg-slate-50 dark:bg-slate-900 rounded-lg border-2 border-dashed border-yellow-300">
                          <AlertCircle className="h-16 w-16 text-yellow-500 mb-4" />
                          <h3 className="text-lg font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
                            Sin datos para el período seleccionado
                          </h3>
                          <p className="text-sm text-muted-foreground text-center max-w-md">
                            No se encontraron reservas completadas en el rango de fechas seleccionado.
                            Intenta seleccionar un período diferente o verifica los filtros aplicados.
                          </p>
                        </div>
                      ) : (
                      <div className="space-y-6 bg-slate-50 dark:bg-slate-900 p-6 rounded-lg">
                        {/* KPIs del Reporte */}
                        <div className="grid gap-4 md:grid-cols-2">
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-center">
                                <p className="text-sm text-muted-foreground mb-1">Ingresos Totales</p>
                                <p className="text-2xl font-bold text-green-600">
                                  {formatCurrency((previewReportData || reportData).revenue?.total || 0)}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardContent className="pt-6">
                              <div className="text-center">
                                <p className="text-sm text-muted-foreground mb-1">Total Reservas</p>
                                <p className="text-2xl font-bold text-blue-600">
                                  {(previewReportData || reportData).checkIns?.total || 0}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Gráficos */}
                        <div className="grid gap-6 md:grid-cols-2">
                          {selectedCharts.bar && (
                            <div id="dashboard-bar-chart">
                              <h4 className="text-sm font-semibold mb-3">Ingresos por Período</h4>
                              {(previewReportData || reportData).revenue?.data?.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                  <BarChart data={(previewReportData || reportData).revenue.data}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis
                                      dataKey="date"
                                      angle={-45}
                                      textAnchor="end"
                                      height={80}
                                      tick={{ fontSize: 11 }}
                                    />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip
                                      formatter={(value) => formatCurrency(value)}
                                      contentStyle={{ fontSize: '12px', borderRadius: '6px' }}
                                    />
                                    <Bar dataKey="total" fill="#10b981" name="Ingresos" radius={[4, 4, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              ) : (
                                <div className="flex items-center justify-center h-[300px] bg-white dark:bg-slate-800 rounded-lg border border-dashed">
                                  <p className="text-muted-foreground">Sin datos disponibles</p>
                                </div>
                              )}
                            </div>
                          )}

                          {selectedCharts.pie && (
                            <div id="dashboard-pie-chart">
                              <h4 className="text-sm font-semibold mb-3">Distribución de Ingresos</h4>
                              {(previewReportData || reportData).revenue?.data?.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                  <PieChart>
                                    <Pie
                                      data={[
                                        { name: 'Habitaciones', value: (previewReportData || reportData).revenue.data.reduce((sum, item) => sum + (item.roomRevenue || 0), 0) },
                                        { name: 'Servicios', value: (previewReportData || reportData).revenue.data.reduce((sum, item) => sum + (item.servicesRevenue || 0), 0) }
                                      ].filter(item => item.value > 0)}
                                      cx="50%"
                                      cy="50%"
                                      labelLine={true}
                                      label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                                      outerRadius={80}
                                      fill="#8884d8"
                                      dataKey="value"
                                    >
                                      {[0, 1].map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                      ))}
                                    </Pie>
                                    <Tooltip
                                      formatter={(value) => formatCurrency(value)}
                                      contentStyle={{ fontSize: '12px', borderRadius: '6px' }}
                                    />
                                    <Legend />
                                  </PieChart>
                                </ResponsiveContainer>
                              ) : (
                                <div className="flex items-center justify-center h-[300px] bg-white dark:bg-slate-800 rounded-lg border border-dashed">
                                  <p className="text-muted-foreground">Sin datos disponibles</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Botones de Descarga */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={async () => {
                              try {
                                const pdf = new jsPDF('p', 'mm', 'a4');
                                
                                // Título
                                pdf.setFontSize(20);
                                pdf.setTextColor(66, 133, 244);
                                pdf.text('Reporte Personalizado', 105, 20, { align: 'center' });
                                
                                // Período
                                pdf.setFontSize(12);
                                pdf.setTextColor(100, 100, 100);
                                pdf.text(
                                  `Período: ${format(dateRange.from, "d 'de' MMM yyyy", { locale: es })} - ${format(dateRange.to, "d 'de' MMM yyyy", { locale: es })}`,
                                  105,
                                  30,
                                  { align: 'center' }
                                );
                                
                                let yPos = 45;
                                
                                // Filtros
                                if (selectedFloor || selectedRoomType) {
                                  pdf.setFontSize(10);
                                  pdf.setTextColor(0, 0, 0);
                                  pdf.text('Filtros aplicados:', 20, yPos);
                                  yPos += 5;
                                  if (selectedFloor) {
                                    pdf.text(`- Piso ${selectedFloor}`, 25, yPos);
                                    yPos += 5;
                                  }
                                  if (selectedRoomType) {
                                    pdf.text(`- Tipo: ${roomTypes.find(t => t.id === selectedRoomType)?.name}`, 25, yPos);
                                    yPos += 5;
                                  }
                                  yPos += 5;
                                }
                                
                                // Resumen
                                pdf.setFontSize(14);
                                pdf.text('Resumen', 20, yPos);
                                yPos += 10;
                                
                                pdf.setFontSize(10);
                                pdf.text(`Ingresos Totales: ${formatCurrency((previewReportData || reportData).revenue?.total || 0)}`, 25, yPos);
                                yPos += 6;
                                pdf.text(`Total Reservas: ${(previewReportData || reportData).checkIns?.total || 0}`, 25, yPos);
                                yPos += 10;
                                
                                // Capturar y agregar gráficos seleccionados
                                if (selectedCharts.bar) {
                                  const barChartElement = document.getElementById('dashboard-bar-chart');
                                  if (barChartElement) {
                                    const canvas = await html2canvas(barChartElement, { scale: 2 });
                                    const imgData = canvas.toDataURL('image/png');
                                    const imgWidth = 170;
                                    const imgHeight = (canvas.height * imgWidth) / canvas.width;
                                    
                                    // Verificar si necesitamos nueva página
                                    if (yPos + imgHeight > 280) {
                                      pdf.addPage();
                                      yPos = 20;
                                    }
                                    
                                    pdf.addImage(imgData, 'PNG', 20, yPos, imgWidth, imgHeight);
                                    yPos += imgHeight + 10;
                                  }
                                }
                                
                                if (selectedCharts.pie) {
                                  const pieChartElement = document.getElementById('dashboard-pie-chart');
                                  if (pieChartElement) {
                                    const canvas = await html2canvas(pieChartElement, { scale: 2 });
                                    const imgData = canvas.toDataURL('image/png');
                                    const imgWidth = 170;
                                    const imgHeight = (canvas.height * imgWidth) / canvas.width;
                                    
                                    // Verificar si necesitamos nueva página
                                    if (yPos + imgHeight > 280) {
                                      pdf.addPage();
                                      yPos = 20;
                                    }
                                    
                                    pdf.addImage(imgData, 'PNG', 20, yPos, imgWidth, imgHeight);
                                    yPos += imgHeight + 10;
                                  }
                                }
                                
                                // Verificar si necesitamos nueva página para la tabla
                                if (yPos > 200) {
                                  pdf.addPage();
                                  yPos = 20;
                                }
                                
                                // Tabla de datos
                                if ((previewReportData || reportData).revenue?.data?.length > 0) {
                                  autoTable(pdf, {
                                    startY: yPos,
                                    head: [['Período', 'Ingresos', 'Reservas']],
                                    body: (previewReportData || reportData).revenue.data.map((item, idx) => [
                                      item.date, // Ya viene formateado del backend con el formato legible (ej: "29 sep - 5 oct")
                                      formatCurrency(item.total),
                                      (previewReportData || reportData).checkIns.data[idx]?.count || 0
                                    ]),
                                    theme: 'grid',
                                    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
                                    bodyStyles: { textColor: [0, 0, 0] },
                                    margin: { left: 20, right: 20 },
                                  });
                                }
                                
                                pdf.save(`Reporte_Personalizado_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
                              } catch (error) {
                                console.error('Error al generar PDF:', error);
                                alert('Error al generar el PDF');
                              }
                            }}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Descargar PDF
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              try {
                                const csvData = (previewReportData || reportData).revenue?.data?.map((item, idx) => ({
                                  'Período': item.date,
                                  'Ingresos Totales': item.total,
                                  'Ingresos Habitaciones': item.roomRevenue || 0,
                                  'Ingresos Servicios': item.servicesRevenue || 0,
                                  'Reservas': (previewReportData || reportData).checkIns.data[idx]?.count || 0
                                })) || [];
                                
                                if (csvData.length > 0) {
                                  exportToExcel(csvData, `Reporte_Personalizado_${format(new Date(), 'yyyy-MM-dd')}`);
                                } else {
                                  alert('No hay datos para exportar');
                                }
                              } catch (error) {
                                console.error('Error al generar Excel:', error);
                                alert('Error al generar el archivo Excel');
                              }
                            }}
                          >
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            Descargar Excel
                          </Button>
                        </div>
                      </div>
                      )
                    ) : null}
                  </div>
                )}
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
                              tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(0)}K` : value}
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
                        <div className="flex items-center justify-center h-[250px] bg-gray-50 rounded-lg border border-dashed border-gray-300">
                          <p className="text-gray-500">Sin datos disponibles</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold mb-3">Tipos de Habitación más Reservadas</h3>
                      {dashboardData.roomTypeStats.length > 0 ? (
                        <div>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={dashboardData.roomTypeStats} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                              <YAxis 
                                type="category" 
                                dataKey="name" 
                                width={120} 
                                tick={{ fontSize: 11 }} 
                                stroke="#9ca3af" 
                              />
                              <Tooltip
                                formatter={(value, name) => {
                                  const total = dashboardData.roomTypeStats.reduce((sum, item) => sum + item.value, 0);
                                  const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                  return [`${value} reservas (${percent}%)`];
                                }}
                                contentStyle={{
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '8px',
                                  color: '#1f2937',
                                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                }}
                              />
                              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {dashboardData.roomTypeStats.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={COLORS[index % COLORS.length]}
                                    fillOpacity={entry.value === 0 ? 0.3 : 1}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                          <div className="text-xs text-center text-gray-500 mt-2">
                            ✅ Mostrando los {dashboardData.roomTypeStats.length} tipos de habitación
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-[300px] bg-gray-50 rounded-lg border border-dashed border-gray-300">
                          <p className="text-gray-500">Sin datos disponibles</p>
                        </div>
                      )}
                    </div>
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

        <TabsContent value="comparisons" className="mt-6">
          {/* Nueva Sección de Comparaciones Avanzadas */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <ArrowLeftRight className="h-6 w-6" />
                    Comparaciones Avanzadas
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Compara tipos de habitación y habitaciones individuales
                  </p>
                </div>
              </div>
            </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {/* Selector de Tipo de Comparación */}
                  <div className="grid gap-3 md:grid-cols-2">
                    <Card
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        comparisonType === 'roomTypes' ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "hover:border-blue-200"
                      )}
                      onClick={() => {
                        setComparisonType('roomTypes');
                        setSelectedItemsToCompare([]);
                        setComparisonData(null);
                      }}
                    >
                      <CardContent className="pt-6 text-center">
                        <Building2 className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                        <h3 className="font-semibold">Tipos de Habitación</h3>
                        <p className="text-xs text-muted-foreground mt-1">Compara diferentes tipos</p>
                      </CardContent>
                    </Card>
                    
                    <Card
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        comparisonType === 'rooms' ? "border-green-500 bg-green-50 dark:bg-green-950" : "hover:border-green-200"
                      )}
                      onClick={() => {
                        setComparisonType('rooms');
                        setSelectedItemsToCompare([]);
                        setComparisonData(null);
                      }}
                    >
                      <CardContent className="pt-6 text-center">
                        <Home className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        <h3 className="font-semibold">Habitaciones</h3>
                        <p className="text-xs text-muted-foreground mt-1">Compara habitaciones específicas</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Botones de Período Rápido para Comparaciones */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={comparisonSelectedPeriod === 'today' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleComparisonQuickPeriod('today')}
                      className="h-8"
                    >
                      Hoy
                    </Button>

                    <Button
                      variant={comparisonSelectedPeriod === '7days' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleComparisonQuickPeriod('7days')}
                      className="h-8"
                    >
                      7 días
                    </Button>

                    <Button
                      variant={comparisonSelectedPeriod === '14days' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleComparisonQuickPeriod('14days')}
                      className="h-8"
                    >
                      14 días
                    </Button>

                    <Button
                      variant={comparisonSelectedPeriod === '30days' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleComparisonQuickPeriod('30days')}
                      className="h-8"
                    >
                      30 días
                    </Button>

                    <Button
                      variant={comparisonSelectedPeriod === '90days' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleComparisonQuickPeriod('90days')}
                      className="h-8"
                    >
                      Trimestre
                    </Button>

                    <Button
                      variant={comparisonSelectedPeriod === '365days' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleComparisonQuickPeriod('365days')}
                      className="h-8"
                    >
                      Anual
                    </Button>
                  </div>

                  {/* Rango de Fechas para Comparación */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Fecha Inicio</Label>
                      <input
                        type="date"
                        value={format(comparisonDateRange.from, 'yyyy-MM-dd')}
                        onChange={(e) => setComparisonDateRange(prev => ({ ...prev, from: new Date(e.target.value) }))}
                        className="w-full p-3 border rounded-md bg-background text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Fecha Fin</Label>
                      <input
                        type="date"
                        value={format(comparisonDateRange.to, 'yyyy-MM-dd')}
                        onChange={(e) => setComparisonDateRange(prev => ({ ...prev, to: new Date(e.target.value) }))}
                        className="w-full p-3 border rounded-md bg-background text-foreground"
                      />
                    </div>
                  </div>

                  {/* Multi-selector según el tipo */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Seleccionar Elementos a Comparar (mínimo 2, máximo 5)
                    </Label>
                    <div className="border rounded-md p-4 bg-slate-50 dark:bg-slate-900">
                      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                        {comparisonType === 'roomTypes' && roomTypes.map((type) => (
                          <label key={type.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={selectedItemsToCompare.includes(type.id.toString())}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  if (selectedItemsToCompare.length < 5) {
                                    setSelectedItemsToCompare([...selectedItemsToCompare, type.id.toString()]);
                                  }
                                } else {
                                  setSelectedItemsToCompare(selectedItemsToCompare.filter(id => id !== type.id.toString()));
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <span className="text-sm">{type.name}</span>
                          </label>
                        ))}
                        
                        {comparisonType === 'rooms' && rooms && rooms.length > 0 && rooms.slice(0, 20).map((room) => (
                          <label key={room.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={selectedItemsToCompare.includes(room.id.toString())}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  if (selectedItemsToCompare.length < 5) {
                                    setSelectedItemsToCompare([...selectedItemsToCompare, room.id.toString()]);
                                  }
                                } else {
                                  setSelectedItemsToCompare(selectedItemsToCompare.filter(id => id !== room.id.toString()));
                                }
                              }}
                              className="w-4 h-4"
                            />
                            <span className="text-sm">Habitación {room.roomNumber} ({room.type})</span>
                          </label>
                        ))}
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-3">
                        {selectedItemsToCompare.length} elemento(s) seleccionado(s) {selectedItemsToCompare.length < 2 && '(mínimo 2)'}
                      </p>
                    </div>
                  </div>

                  {/* Botón Generar Comparación */}
                  <div className="flex gap-3">
                    <Button
                      onClick={generateComparison}
                      disabled={selectedItemsToCompare.length < 2 || isLoadingComparison}
                    >
                      {isLoadingComparison ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generando...
                        </>
                      ) : (
                        <>
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Generar Comparación
                        </>
                      )}
                    </Button>
                    
                    {comparisonData && (
                      <>
                        <Button
                          onClick={exportComparisonPDF}
                          variant="outline"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Descargar PDF
                        </Button>
                        <Button
                          onClick={exportComparisonExcel}
                          variant="outline"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Descargar Excel
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Mensaje cuando no hay datos */}
                  {!isLoadingComparison && comparisonData !== null && comparisonData.length === 0 && (
                    <div className="mt-6 p-8 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-8 w-8 text-yellow-600" />
                        <div>
                          <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">No hay datos disponibles</h4>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            No se encontraron datos para los elementos seleccionados en el período indicado.
                            Verifica que las entidades seleccionadas tengan reservas completadas en este rango de fechas.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Resultados de la Comparación */}
                  {comparisonData && comparisonData.length > 0 && (
                    <div className="space-y-6 mt-6 p-6 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-purple-600" />
                        Resultados de la Comparación
                      </h3>

                      {/* Tabla Comparativa */}
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b-2 border-purple-200">
                              <th className="text-left p-3 font-semibold">Nombre</th>
                              <th className="text-right p-3 font-semibold">Ingresos</th>
                              <th className="text-right p-3 font-semibold">Reservas</th>
                              {comparisonType !== 'clients' && (
                                <th className="text-right p-3 font-semibold">Personas</th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {comparisonData.map((item, index) => (
                              <tr key={item.id} className="border-b hover:bg-slate-100 dark:hover:bg-slate-800">
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    <span className="font-medium">{item.name}</span>
                                    {item.noData && (
                                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Sin datos</span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 text-right font-semibold text-green-600">
                                  {item.noData ? '-' : formatCurrency(item.totalRevenue)}
                                </td>
                                <td className="p-3 text-right">{item.noData ? '-' : item.totalReservations}</td>
                                {comparisonType !== 'clients' && (
                                  <td className="p-3 text-right text-blue-600 font-semibold">
                                    {item.noData ? '-' : (item.totalGuests || 0)}
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Gráficos Comparativos */}
                      <div className="grid gap-6 md:grid-cols-2">
                        {/* Gráfico de Ingresos */}
                        <div>
                          <h4 className="text-sm font-semibold mb-3">Comparación de Ingresos</h4>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={comparisonData.filter(item => !item.noData)}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
                              <YAxis />
                              <Tooltip formatter={(value) => formatCurrency(value)} />
                              <Bar dataKey="totalRevenue" name="Ingresos">
                                {comparisonData.filter(item => !item.noData).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Gráfico de Reservas */}
                        <div>
                          <h4 className="text-sm font-semibold mb-3">Comparación de Reservas</h4>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={comparisonData.filter(item => !item.noData)}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} fontSize={12} />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="totalReservations" name="Reservas">
                                {comparisonData.filter(item => !item.noData).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Gráfico Circular de Proporción de Ingresos */}
                      <div className="flex justify-center">
                        <div className="w-full max-w-md">
                          <h4 className="text-sm font-semibold mb-3 text-center">Distribución de Ingresos</h4>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={comparisonData.filter(item => !item.noData)}
                                dataKey="totalRevenue"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={(entry) => `${entry.name}: ${formatCurrency(entry.totalRevenue)}`}
                              >
                                {comparisonData.filter(item => !item.noData).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => formatCurrency(value)} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
