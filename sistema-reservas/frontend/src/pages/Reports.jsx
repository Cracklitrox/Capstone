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
  BarChart3,
  FileSpreadsheet,
  Building2
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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

// Función auxiliar para exportar datos a CSV (alternativa a Excel sin dependencias)
const exportToCSV = (data, filename) => {
  try {
    if (!data || data.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    // Asegurarse de que todos los valores estén en formato string y escapados correctamente
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          let value = row[header];
          
          // Convertir valores null o undefined a cadena vacía
          if (value === null || value === undefined) {
            return '""';
          }
          
          // Convertir objetos a string JSON
          if (typeof value === 'object') {
            value = JSON.stringify(value);
          }
          
          // Convertir el valor a string y escapar caracteres especiales
          value = String(value).replace(/"/g, '""');
          
          // Encerrar en comillas si contiene comas, saltos de línea o comillas
          if (value.includes(',') || value.includes('\n') || value.includes('"') || value.includes(' ')) {
            return `"${value}"`;
          }
          
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error al exportar a CSV:', error);
    alert('Error al generar el archivo CSV');
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
            Descargar CSV
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
          exportToCSV(summaryData, fileName);
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

  const [reportType, setReportType] = useState('client'); // 'client', 'room', 'roomType', 'topClients'
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedRoomType, setSelectedRoomType] = useState(null);
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
  const [filteredRooms, setFilteredRooms] = useState([]);

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

  // Efecto para cargar los tipos de habitación
  useEffect(() => {
    const loadRoomTypes = async () => {
      try {
        console.log('Cargando tipos de habitación...');
        const response = await fetch('http://localhost:3001/api/v1/admin/rooms/room-types', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Tipos de habitación cargados:', data);
          // Asegurarse de procesar correctamente la estructura de datos
          let types;
          if (Array.isArray(data)) {
            types = data;
          } else if (data.data && Array.isArray(data.data)) {
            types = data.data;
          } else {
            types = [];
          }
          
          // Filtrar solo los tipos activos y mapearlos
          const activeTypes = types
            .filter(rt => rt.is_active !== false)
            .map(rt => ({
              id: rt.id,
              name: rt.name || 'Sin nombre'
            }));
          
          console.log('Tipos de habitación procesados:', activeTypes);
          setRoomTypes(activeTypes);
        } else {
          console.error('Error al cargar tipos de habitación:', response.status);
          const errorText = await response.text();
          console.error('Detalle del error:', errorText);
        }
      } catch (error) {
        console.error('Error al cargar tipos de habitación:', error);
      }
    };

    loadRoomTypes();
    // Recargar cada 30 segundos
    const interval = setInterval(loadRoomTypes, 30000);
    return () => clearInterval(interval);
  }, []);

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
          console.log('Clientes con reservas:', clientsWithReservations.length);
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
        console.log('📡 Respuesta habitaciones:', roomsResponse.status, roomsResponse.statusText);
        if (roomsResponse.ok) {
          const roomsData = await roomsResponse.json();
          console.log('📦 Datos habitaciones raw:', roomsData);
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
          console.log('✅ Habitaciones procesadas:', roomsList.length, roomsList);
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
        console.log('📡 Respuesta tipos de habitación:', typesResponse.status, typesResponse.statusText);
        if (typesResponse.ok) {
          const typesData = await typesResponse.json();
          console.log('📦 Datos tipos habitación raw:', typesData);
          // El backend puede devolver el array directamente o en { data: [...] }
          const rawData = Array.isArray(typesData) ? typesData : (typesData.data || []);
          const typesList = rawData.map(rt => ({
            id: rt.id,
            name: rt.name
          }));
          console.log('✅ Tipos de habitación procesados:', typesList.length, typesList);
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
          if (!selectedEntity) {
            alert('Seleccione una habitación');
            setIsLoading(false);
            return;
          }
          data = await getRoomCustomReport(selectedEntity, startDate, endDate, params);
          break;
        case 'roomType':
          if (!selectedEntity) {
            alert('Seleccione un tipo de habitación');
            setIsLoading(false);
            return;
          }
          data = await getRoomTypeCustomReport(selectedEntity, startDate, endDate, params);
          break;
        case 'topClients':
          data = await getTopClientsRevenue(startDate, endDate, 50, params);
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
          exportToCSV(summaryData, fileName);
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
            {/* Filtro de Piso */}
            <div className="space-y-2">
              <Label>Filtrar por Piso</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedFloor === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFloor(null)}
                  className="h-8"
                >
                  Todos
                </Button>
                {[1, 2, 3, 4].map((floor) => (
                  <Button
                    key={floor}
                    variant={selectedFloor === floor ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedFloor(floor)}
                    className="h-8"
                  >
                    <Building2 className="mr-1 h-4 w-4" />
                    Piso {floor}
                  </Button>
                ))}
              </div>
              {selectedFloor && (
                <p className="text-xs text-muted-foreground mt-1">
                  Filtrando por: Piso {selectedFloor}
                </p>
              )}
            </div>

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
                  className="w-full p-3 border rounded-md bg-background text-foreground"
                >
                  <option value="">Seleccione una Opción</option>
                  {reportType === 'client' && (
                    clients.length > 0 ? clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} - {c.email}</option>
                    )) : <option disabled>No hay clientes disponibles</option>
                  )}
                  {reportType === 'room' && (
                    filteredRooms.length > 0 ? filteredRooms.map(r => (
                      <option key={r.id} value={r.id}>Habitación {r.roomNumber} ({r.type}) - Piso {r.floor}</option>
                    )) : <option disabled>No hay habitaciones disponibles</option>
                  )}
                  {reportType === 'roomType' && (
                    roomTypes.length > 0 ? roomTypes.map(rt => (
                      <option key={rt.id} value={rt.id}>{rt.name}</option>
                    )) : <option disabled>Cargando tipos de habitación...</option>
                  )}
                </select>
                {reportType === 'client' && clients.length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">⚠️ No se encontraron clientes. Verifica los permisos.</p>
                )}
                {reportType === 'room' && rooms.length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">⚠️ No se encontraron habitaciones. Verifica los permisos.</p>
                )}
                {reportType === 'roomType' && roomTypes.length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">⚠️ No se encontraron tipos de habitación. Verifica los permisos.</p>
                )}
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

            {reportData && (reportData.data || reportData.topClients) && (
              <DownloadButton
                onDownloadPDF={() => handleDownload('pdf')}
                onDownloadExcel={() => {
                  const data = reportData.data ? (reportData.data?.reservations || reportData.data?.roomsBreakdown || []) : [];
                  if (data.length > 0) {
                    // Preparar los datos para Excel basado en el tipo de reporte
                    const fileName = `Reporte_${reportType}_${format(dateRange.from, 'yyyy-MM-dd')}_${format(dateRange.to, 'yyyy-MM-dd')}`;
                    exportToCSV(data, fileName);
                  } else {
                    alert('No hay datos para exportar');
                  }
                }}
                className="flex-1"
              />
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
                      <div className="text-2xl font-bold text-blue-600">{reportData.data.summary.occupancyRate.toFixed(1)}%</div>
                      <p className="text-xs text-muted-foreground">Tasa de Ocupación</p>
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

// Componente de Comparaciones
const ComparisonsSection = () => {
  const [compareType, setCompareType] = useState('days'); // days, months, rooms, clients
  const [dateRange1, setDateRange1] = useState({ from: null, to: null });
  const [dateRange2, setDateRange2] = useState({ from: null, to: null });
  const [compareData, setCompareData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCompare = async () => {
    setIsLoading(true);
    try {
      // Aquí irían las llamadas a la API según el tipo de comparación
      const period1Data = await getPeriodData(dateRange1.from, dateRange1.to);
      const period2Data = await getPeriodData(dateRange2.from, dateRange2.to);
      
      setCompareData({
        period1: period1Data,
        period2: period2Data
      });
    } catch (error) {
      console.error('Error al generar comparación:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Comparación de Períodos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <Label>Tipo de Comparación</Label>
              <select
                value={compareType}
                onChange={(e) => setCompareType(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="days">Día vs Día</option>
                <option value="months">Mes vs Mes</option>
                <option value="rooms">Habitaciones</option>
                <option value="clients">Clientes</option>
              </select>
            </div>

            <div className="space-y-4">
              <Label>Primer Período</Label>
              <Calendar
                mode="range"
                selected={dateRange1}
                onSelect={setDateRange1}
              />
            </div>

            <div className="space-y-4">
              <Label>Segundo Período</Label>
              <Calendar
                mode="range"
                selected={dateRange2}
                onSelect={setDateRange2}
              />
            </div>
          </div>

          <Button
            onClick={handleCompare}
            disabled={isLoading}
            className="mt-4"
          >
            {isLoading ? 'Comparando...' : 'Generar Comparación'}
          </Button>

          {compareData && (
            <div className="mt-6">
              {/* Aquí irían los gráficos y tablas de comparación */}
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('30days');
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [selectedRoomType, setSelectedRoomType] = useState(null);
  const [channelData, setChannelData] = useState([]);
  const [filterMode, setFilterMode] = useState('calendar'); // 'calendar' o 'rolling'
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

      const [weeklyRev, dailyOcc, dailyRev, roomTypes, monthlyRev, totalPaid] = await Promise.all([
        getWeeklyRevenue(startDate, endDate),
        getDailyOccupancy(weekStart, weekEnd),
        getDailyRevenue(weekStart, weekEnd),
        getRoomTypeStats(monthStart, monthEnd),
        getMonthlyRevenue(monthStart, monthEnd),
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
          
          label = `Semana ${weekNum}\n${format(startDate, "d 'de' MMM", { locale: es })} - ${format(endDate, "d 'de' MMM", { locale: es })}`;
        } else {
          label = item.periodLabel || `Semana ${index + 1}`;
        }
        
        return {
          semana: label,
          ingresos: item.totalRevenue || 0,
        };        // Si el backend proporciona startDate y endDate en el futuro, usar eso
        // Por ahora, usar el periodLabel del backend
        if (periodString.includes('W')) {
          // Extraer el número de semana del formato "2025-W41"
          const weekNumber = periodString.split('-W')[1];
          label = `Sem ${weekNumber}`;

          // Calcular fechas de inicio y fin de la semana
          const year = parseInt(periodString.split('-W')[0]);
          const week = parseInt(weekNumber);

          // Calcular el primer día de la semana (Lunes)
          const firstDayOfYear = new Date(year, 0, 1);
          const daysOffset = (week - 1) * 7;
          const weekStart = new Date(firstDayOfYear);
          weekStart.setDate(firstDayOfYear.getDate() + daysOffset - firstDayOfYear.getDay() + 1);

          // Calcular el último día de la semana (Domingo)
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);

          // Formatear las fechas
          const startFormatted = format(weekStart, 'dd/MM/yyyy');
          const endFormatted = format(weekEnd, 'dd/MM/yyyy');

          label = `Sem ${weekNumber}: ${startFormatted} - ${endFormatted}`;
        }

        return {
          semana: label,
          ingresos: item.totalRevenue || 0,
        };
      }) || [];

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
          ocupacion: dayData ? (dayData.occupiedRoomNights || 0) : 0,
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
    } finally {
      setLoadingDashboard(false);
    }
  };

  const loadClientsData = async () => {
    try {
      console.log('Iniciando carga de datos de clientes...');
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
          // Año PASADO completo (1 enero a 31 diciembre del año anterior)
          const lastYear = today.getFullYear() - 1;
          from = new Date(lastYear, 0, 1, 0, 0, 0);
          to = new Date(lastYear, 11, 31, 23, 59, 59);
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
          // Para el reporte anual, usamos el año actual
          const currentYear = new Date().getFullYear();
          const yearStart = `${currentYear}-01-01`;
          const yearEnd = format(new Date(), 'yyyy-MM-dd');
          [revenue, occupancy] = await Promise.all([
            getYearlyRevenue(yearStart, yearEnd),
            getYearlyOccupancy(yearStart, yearEnd),
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

    setDateRange({ from, to });
    setSelectedPeriod(period);

    // Auto-generar reporte con tipo inteligente
    const reportType = getIntelligentReportType(from, to);
    await handleGenerateReport(reportType, 'rolling');

    // Recargar datos del dashboard con el nuevo rango
    await loadDashboardData();
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

      exportToCSV(csvData, `${chartName}_${format(new Date(), 'yyyy-MM-dd')}`);
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

      exportToCSV(csvData, `Reservas_por_Canal_${format(new Date(), 'yyyy-MM-dd')}`);
    } catch (error) {
      console.error('Error al generar CSV:', error);
      alert('Error al generar el archivo CSV');
    }
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
          setRoomTypes(data.data || []);
        } else {
          console.error('Error al cargar tipos de habitación');
        }
      } catch (error) {
        console.error('Error al cargar tipos de habitación:', error);
      }
    };

    loadRoomTypes();
  }, []);

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
                <CardTitle className="text-sm font-medium">Ingresos Diarios (Promedio)</CardTitle>
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
                <p className="text-xs text-muted-foreground mt-1">Últimos 7 días (promedio por día)</p>
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
                    onClick={() => handleQuickPeriod('today')}
                    className="h-8"
                  >
                    Hoy
                  </Button>

                  <Button
                    variant={selectedPeriod === '7days' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleQuickPeriod('7days')}
                    className="h-8"
                  >
                    7 días
                  </Button>

                  <Button
                    variant={selectedPeriod === '14days' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleQuickPeriod('14days')}
                    className="h-8"
                  >
                    14 días
                  </Button>

                  <Button
                    variant={selectedPeriod === '30days' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleQuickPeriod('30days')}
                    className="h-8"
                  >
                    30 días
                  </Button>

                  <Button
                    variant={selectedPeriod === '90days' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleQuickPeriod('90days')}
                    className="h-8"
                  >
                    Trimestre
                  </Button>

                  <Button
                    variant={selectedPeriod === '365days' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleQuickPeriod('365days')}
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
                        onSelect={(date) => {
                          if (date) {
                            const newRange = { ...dateRange, from: date };
                            setDateRange(newRange);
                            setSelectedPeriod('custom');
                            // Auto-generar reporte con tipo inteligente
                            if (newRange.to) {
                              const reportType = getIntelligentReportType(newRange.from, newRange.to);
                              handleGenerateReport(reportType, 'rolling');
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
                        onSelect={(date) => {
                          if (date) {
                            const newRange = { ...dateRange, to: date };
                            setDateRange(newRange);
                            setSelectedPeriod('custom');
                            // Auto-generar reporte con tipo inteligente
                            if (newRange.from) {
                              const reportType = getIntelligentReportType(newRange.from, newRange.to);
                              handleGenerateReport(reportType, 'rolling');
                            }
                          }
                        }}
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Filtros de Piso y Tipo de Habitación */}
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Filtro de Piso */}
                  <div className="flex-1">
                    <Label className="text-sm font-semibold mb-2">Filtrar por Piso</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        variant={selectedFloor === null ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedFloor(null)}
                        className="h-8"
                      >
                        Todos
                      </Button>
                      {[1, 2, 3, 4].map((floor) => (
                        <Button
                          key={floor}
                          variant={selectedFloor === floor ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedFloor(floor)}
                          className="h-8"
                        >
                          <Building2 className="mr-1 h-4 w-4" />
                          Piso {floor}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Filtro de Tipo de Habitación */}
                  <div className="flex-1">
                    <Label className="text-sm font-semibold mb-2">Tipo de Habitación</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        variant={selectedRoomType === null ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedRoomType(null)}
                        className="h-8"
                      >
                        Todos los Tipos
                      </Button>
                      {roomTypes.map((type) => (
                        <Button
                          key={type.id}
                          variant={selectedRoomType === type.id ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedRoomType(type.id)}
                          className="h-8"
                        >
                          <Home className="mr-1 h-4 w-4" />
                          {type.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Estado de los filtros */}
                {(selectedFloor || selectedRoomType) && (
                  <div className="mt-2 text-xs text-muted-foreground space-y-1">
                    {selectedFloor && (
                      <p>Mostrando solo habitaciones del piso {selectedFloor}</p>
                    )}
                    {selectedRoomType && (
                      <p>Filtrando por tipo: {roomTypes.find(t => t.id === selectedRoomType)?.name}</p>
                    )}
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
                              formatter={(value) => `${value} reservas`}
                              contentStyle={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                color: '#1f2937',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
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
      </Tabs>

      <ReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={reportData}
        dateRange={dateRange}
        reportType={selectedReportType}
        selectedChartsFromParent={selectedCharts}
      />
    </div>
  );
};

export default Reports;
