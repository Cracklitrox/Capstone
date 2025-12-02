import React, { useState } from 'react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileSpreadsheet, FileText, Calendar as CalendarIcon, Users, TrendingUp } from 'lucide-react';
import useDashboardAdmin from '../hooks/useDashboardAdmin';
import ReportFilters from '@/components/reports/ReportFilters';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { exportToExcel } from '@/lib/excelExport';
import { exportToPDF } from '@/lib/pdfExport';

const AdminReports = () => {
  const [dateRange, setDateRange] = useState(() => {
    const yesterday = subDays(new Date(), 1);
    return { from: subDays(yesterday, 7), to: yesterday };
  });
  const [filterValues, setFilterValues] = useState({ quickPeriod: '7days' });

  const startDate = format(dateRange.from, 'yyyy-MM-dd');
  const endDate = format(dateRange.to, 'yyyy-MM-dd');

  const { data, loading } = useDashboardAdmin(startDate, endDate);

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
      fileName: 'reporte_admin',
      kpis: data.kpis?.current || {},
      data: data.revenue || [],
      dateRange
    });
  };

  const handleExportPDF = async () => {
    if (!data) return;
    await exportToPDF({
      fileName: 'reporte_admin',
      title: 'Reporte Administrativo',
      kpis: { ...data.kpis?.current, trends: data.kpis?.trends },
      topData: data.topRoomTypes?.slice(0, 5) || [],
      dateRange
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header Simple */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl">Dashboard Administrativo</CardTitle>
              <p className="text-sm text-muted-foreground">Vista ejecutiva semanal</p>
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

      {/* KPIs Simples */}
      {data?.kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500 rounded-full">
                  <CalendarIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reservas</p>
                  <p className="text-2xl font-bold">{data.kpis.current.totalReservations}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500 rounded-full">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clientes</p>
                  <p className="text-2xl font-bold">{data.kpis.current.totalClients || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500 rounded-full">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ocupación</p>
                  <p className="text-2xl font-bold">{Math.round(data.kpis.current.occupancyRate || 0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráfico */}
      {data?.occupancy && data.occupancy.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ocupación Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.occupancy.slice(-7)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="periodLabel" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="occupancyPercentage" fill="#10b981" name="Ocupación %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminReports;
