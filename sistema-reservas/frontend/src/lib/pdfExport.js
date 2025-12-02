import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Exporta reportes a PDF con formato profesional
 */

// Colores del tema
const COLORS = {
  primary: [37, 99, 235],      // Blue 600
  secondary: [16, 185, 129],   // Green 500
  dark: [31, 41, 55],          // Gray 800
  light: [243, 244, 246],      // Gray 100
  white: [255, 255, 255],
  red: [239, 68, 68]           // Red 500
};

/**
 * Añade el header al PDF con logo y título
 */
const addHeader = (doc, title, dateRange) => {
  // Fondo del header
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');

  // Título
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('HOTEL DON TEO', 14, 15);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 25);

  // Fecha del reporte (derecha)
  doc.setFontSize(10);
  const reportDate = `Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`;
  const textWidth = doc.getTextWidth(reportDate);
  doc.text(reportDate, doc.internal.pageSize.width - textWidth - 14, 15);

  // Período (derecha)
  if (dateRange) {
    const period = `Período: ${format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: es })}`;
    const periodWidth = doc.getTextWidth(period);
    doc.text(period, doc.internal.pageSize.width - periodWidth - 14, 25);
  }

  // Línea separadora
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(14, 42, doc.internal.pageSize.width - 14, 42);

  return 48; // Retorna la posición Y después del header
};

/**
 * Añade el footer con número de página y usuario
 */
const addFooter = (doc, pageNumber, userName = 'Administrador') => {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;

  // Línea separadora
  doc.setDrawColor(...COLORS.light);
  doc.setLineWidth(0.5);
  doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);

  // Footer text
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.dark);
  doc.text(`Generado por: ${userName}`, 14, pageHeight - 14);

  const pageText = `Página ${pageNumber}`;
  const pageTextWidth = doc.getTextWidth(pageText);
  doc.text(pageText, pageWidth - pageTextWidth - 14, pageHeight - 14);

  doc.text('Hotel Don Teo - Sistema de Reservas', pageWidth / 2, pageHeight - 14, { align: 'center' });
};

/**
 * Añade sección de KPIs
 */
const addKPIsSection = (doc, kpis, startY) => {
  let currentY = startY;

  // Título de sección
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text('RESUMEN EJECUTIVO', 14, currentY);
  currentY += 10;

  // Tabla de KPIs
  const kpiData = [
    ['Tasa de Ocupación', `${kpis.occupancyRate || 0}%`, `${kpis.trends?.occupancyRate > 0 ? '+' : ''}${kpis.trends?.occupancyRate || 0}%`],
    ['Ingresos Totales', `$${(kpis.totalRevenue || 0).toLocaleString('es-CL')}`, `${kpis.trends?.totalRevenue > 0 ? '+' : ''}${kpis.trends?.totalRevenue || 0}%`],
    ['Total Reservas', `${kpis.totalReservations || 0}`, `${kpis.trends?.totalReservations > 0 ? '+' : ''}${kpis.trends?.totalReservations || 0}%`],
    ['RevPAR', `$${(kpis.revPAR || 0).toLocaleString('es-CL')}`, `${kpis.trends?.revPAR > 0 ? '+' : ''}${kpis.trends?.revPAR || 0}%`],
    ['ADR', `$${(kpis.adr || 0).toLocaleString('es-CL')}`, `${kpis.trends?.adr > 0 ? '+' : ''}${kpis.trends?.adr || 0}%`],
    ['Duración Promedio', `${kpis.averageStayDuration || 0} días`, '-'],
    ['Total Clientes', `${kpis.totalClients || 0}`, `${kpis.trends?.totalClients > 0 ? '+' : ''}${kpis.trends?.totalClients || 0}%`],
    ['Tasa de Cancelación', `${kpis.cancellationRate || 0}%`, `${kpis.trends?.cancellationRate > 0 ? '+' : ''}${kpis.trends?.cancellationRate || 0}%`]
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Métrica', 'Valor Actual', 'Tendencia']],
    body: kpiData,
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9
    },
    alternateRowStyles: {
      fillColor: COLORS.light
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 70 },
      1: { halign: 'right', cellWidth: 60 },
      2: { halign: 'center', cellWidth: 40 }
    },
    didParseCell: (data) => {
      // Colorear la columna de tendencia
      if (data.column.index === 2 && data.section === 'body') {
        const value = parseFloat(data.cell.text[0]);
        if (!isNaN(value)) {
          if (value > 0) {
            data.cell.styles.textColor = COLORS.secondary;
            data.cell.styles.fontStyle = 'bold';
          } else if (value < 0) {
            data.cell.styles.textColor = COLORS.red;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    }
  });

  return doc.lastAutoTable.finalY + 10;
};

/**
 * Añade tabla de datos detallados
 */
const addDetailTable = (doc, data, title, startY) => {
  let currentY = startY;

  // Título de sección
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text(title, 14, currentY);
  currentY += 10;

  if (!data || data.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('No hay datos disponibles para este período', 14, currentY);
    return currentY + 10;
  }

  // Preparar headers y body
  const headers = Object.keys(data[0]);
  const body = data.slice(0, 10).map(row => Object.values(row)); // Top 10

  autoTable(doc, {
    startY: currentY,
    head: [headers],
    body: body,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontSize: 9,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8
    },
    alternateRowStyles: {
      fillColor: COLORS.light
    },
    styles: {
      cellPadding: 3,
      overflow: 'linebreak'
    },
    columnStyles: headers.reduce((acc, header, index) => {
      acc[index] = { cellWidth: 'auto' };
      return acc;
    }, {}),
    didParseCell: (data) => {
      // Formatear montos
      if (data.section === 'body') {
        const value = data.cell.raw;
        if (typeof value === 'number' && value > 100) {
          data.cell.text = [`$${value.toLocaleString('es-CL')}`];
        }
      }
    }
  });

  return doc.lastAutoTable.finalY + 10;
};

/**
 * Exporta reporte completo a PDF
 */
export const exportToPDF = async ({
  fileName = 'reporte',
  title = 'Reporte de Gestión',
  kpis = {},
  data = [],
  topData = [],
  dateRange = { from: new Date(), to: new Date() },
  userName = 'Administrador'
}) => {
  const doc = new jsPDF();
  let currentY = 0;
  let pageNumber = 1;

  // Header
  currentY = addHeader(doc, title, dateRange);

  // KPIs
  if (kpis && Object.keys(kpis).length > 0) {
    currentY = addKPIsSection(doc, kpis, currentY + 5);
  }

  // Verificar si necesita nueva página
  if (currentY > doc.internal.pageSize.height - 60) {
    doc.addPage();
    pageNumber++;
    currentY = addHeader(doc, title, dateRange);
  }

  // Tabla de Top 10 o datos destacados
  if (topData && topData.length > 0) {
    currentY = addDetailTable(doc, topData, 'TOP 10', currentY + 5);
  }

  // Footer
  addFooter(doc, pageNumber, userName);

  // Si hay más páginas de datos completos
  if (data && data.length > 10) {
    doc.addPage();
    pageNumber++;
    currentY = addHeader(doc, title, dateRange);
    addDetailTable(doc, data, 'DATOS COMPLETOS', currentY + 5);
    addFooter(doc, pageNumber, userName);
  }

  // Guardar
  doc.save(`${fileName}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
};

/**
 * Exporta solo KPIs a PDF
 */
export const exportKPIsToPDF = async (kpis, dateRange, fileName = 'kpis', userName) => {
  return exportToPDF({
    fileName,
    title: 'Indicadores Clave de Rendimiento',
    kpis,
    data: [],
    dateRange,
    userName
  });
};

/**
 * Exporta tabla simple a PDF
 */
export const exportTableToPDF = async (data, title, fileName, dateRange, userName) => {
  return exportToPDF({
    fileName: fileName || 'tabla',
    title: title || 'Reporte Detallado',
    kpis: {},
    topData: data,
    dateRange: dateRange || { from: new Date(), to: new Date() },
    userName
  });
};

/**
 * Convierte un gráfico de Recharts a imagen y lo agrega al PDF
 * (Se puede implementar capturando el canvas del gráfico)
 */
export const addChartToPDF = (doc, chartElement, x, y, width, height) => {
  // Esta función requiere html2canvas o similar para capturar el gráfico
  // Por ahora es un placeholder
  console.warn('addChartToPDF no implementado aún - requiere html2canvas');
};
