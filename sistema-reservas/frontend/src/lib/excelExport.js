import XlsxPopulatePromise from './xlsx-wrapper.js';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Exporta reportes a Excel con formato profesional usando xlsx-populate
 */

export const exportToExcel = async ({
  fileName = 'reporte',
  kpis = {},
  data = [],
  dateRange = { from: new Date(), to: new Date() }
}) => {
  const XlsxPopulate = await XlsxPopulatePromise;
  const workbook = await XlsxPopulate.fromBlankAsync();

  // SHEET 1: Resumen Ejecutivo
  const summarySheet = workbook.sheet(0);
  summarySheet.name('Resumen Ejecutivo');

  // Título
  summarySheet.range('A1:C1').merged(true).value('REPORTE HOTEL DON TEO')
    .style({
      fontSize: 16,
      bold: true,
      fontColor: 'FFFFFF',
      fill: '2563EB',
      horizontalAlignment: 'center',
      verticalAlignment: 'center'
    });
  summarySheet.row(1).height(30);

  // Período
  summarySheet.range('A2:C2').merged(true)
    .value(`Período: ${format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: es })}`)
    .style({ fontSize: 11, italic: true, horizontalAlignment: 'center' });

  // KPIs Header
  let row = 4;
  summarySheet.range(`A${row}:C${row}`).merged(true).value('INDICADORES PRINCIPALES')
    .style({ fontSize: 12, bold: true, fill: 'E5E7EB' });
  row++;

  // Headers de tabla KPIs
  summarySheet.cell(`A${row}`).value('Métrica').style({ bold: true, fill: '3B82F6', fontColor: 'FFFFFF', horizontalAlignment: 'center' });
  summarySheet.cell(`B${row}`).value('Valor Actual').style({ bold: true, fill: '3B82F6', fontColor: 'FFFFFF', horizontalAlignment: 'center' });
  summarySheet.cell(`C${row}`).value('Tendencia').style({ bold: true, fill: '3B82F6', fontColor: 'FFFFFF', horizontalAlignment: 'center' });
  row++;

  // Datos KPIs
  const kpiData = [
    { name: 'Tasa de Ocupación', value: `${kpis.occupancyRate || 0}%`, trend: kpis.trends?.occupancyRate || 0 },
    { name: 'Ingresos Totales', value: `$${(kpis.totalRevenue || 0).toLocaleString('es-CL')}`, trend: kpis.trends?.totalRevenue || 0 },
    { name: 'Total Reservas', value: kpis.totalReservations || 0, trend: kpis.trends?.totalReservations || 0 },
    { name: 'RevPAR', value: `$${(kpis.revPAR || 0).toLocaleString('es-CL')}`, trend: kpis.trends?.revPAR || 0 },
    { name: 'ADR', value: `$${(kpis.adr || 0).toLocaleString('es-CL')}`, trend: kpis.trends?.adr || 0 },
    { name: 'Duración Promedio', value: `${kpis.averageStayDuration || 0} días`, trend: 0 },
    { name: 'Total Clientes', value: kpis.totalClients || 0, trend: kpis.trends?.totalClients || 0 },
    { name: 'Tasa de Cancelación', value: `${kpis.cancellationRate || 0}%`, trend: kpis.trends?.cancellationRate || 0 }
  ];

  kpiData.forEach((kpi, index) => {
    summarySheet.cell(`A${row}`).value(kpi.name);
    summarySheet.cell(`B${row}`).value(kpi.value).style({ horizontalAlignment: 'right' });
    summarySheet.cell(`C${row}`).value(`${kpi.trend > 0 ? '+' : ''}${kpi.trend}%`)
      .style({
        horizontalAlignment: 'center',
        fontColor: kpi.trend > 0 ? '10B981' : kpi.trend < 0 ? 'EF4444' : '6B7280'
      });

    // Alternar colores
    if (index % 2 === 0) {
      summarySheet.range(`A${row}:C${row}`).style({ fill: 'F9FAFB' });
    }
    row++;
  });

  // Ajustar anchos de columna
  summarySheet.column('A').width(30);
  summarySheet.column('B').width(20);
  summarySheet.column('C').width(20);

  // SHEET 2: Datos Detallados (si hay)
  if (data && data.length > 0) {
    const detailSheet = workbook.addSheet('Datos Detallados');

    // Título
    detailSheet.range('A1:F1').merged(true).value('DETALLE DE RESERVAS')
      .style({
        fontSize: 14,
        bold: true,
        fontColor: 'FFFFFF',
        fill: '2563EB',
        horizontalAlignment: 'center',
        verticalAlignment: 'center'
      });
    detailSheet.row(1).height(25);

    // Headers
    const headers = Object.keys(data[0]);
    headers.forEach((header, index) => {
      detailSheet.cell(2, index + 1).value(header)
        .style({ bold: true, fill: '3B82F6', fontColor: 'FFFFFF', horizontalAlignment: 'center' });
    });

    // Datos
    data.forEach((item, rowIndex) => {
      headers.forEach((header, colIndex) => {
        const cell = detailSheet.cell(rowIndex + 3, colIndex + 1);
        cell.value(item[header]);

        // Alternar colores
        if (rowIndex % 2 === 0) {
          cell.style({ fill: 'F9FAFB' });
        }
      });
    });

    // Auto-ajustar columnas (aproximado)
    headers.forEach((header, index) => {
      detailSheet.column(index + 1).width(Math.max(header.length + 2, 15));
    });
  }

  // Generar y descargar
  const blob = await workbook.outputAsync();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};

/**
 * Exporta solo KPIs a Excel
 */
export const exportKPIsToExcel = async (kpis, dateRange, fileName = 'kpis') => {
  return exportToExcel({
    fileName,
    kpis,
    data: [],
    dateRange
  });
};

/**
 * Exporta datos tabulares a Excel
 */
export const exportTableToExcel = async (data, fileName = 'tabla', dateRange) => {
  return exportToExcel({
    fileName,
    kpis: {},
    data,
    dateRange: dateRange || { from: new Date(), to: new Date() }
  });
};
