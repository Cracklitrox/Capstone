import { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3001/api/v1';

/**
 * Hook personalizado para manejar todas las llamadas a la API de reportes
 * @returns {Object} Métodos para obtener diferentes tipos de reportes
 */
export const useReportsApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  /**
   * Función genérica para obtener reportes
   * @param {string} endpoint - El endpoint de la API (revenue, occupancy, kpis)
   * @param {string} groupBy - Agrupación (day, week, month, year)
   * @param {string} startDate - Fecha de inicio (YYYY-MM-DD)
   * @param {string} endDate - Fecha de fin (YYYY-MM-DD)
   */
  const fetchReport = useCallback(async (endpoint, groupBy, startDate, endDate) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (groupBy) params.append('groupBy', groupBy);
      
      const url = `${API_URL}/reports/${endpoint}?${params.toString()}`;
      const response = await axios.get(url, getAuthHeaders());
      setLoading(false);
      // Extraer el data del objeto de respuesta del backend
      return { data: response.data.data || [] };
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Error al obtener el reporte';
      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  }, []);

  // Reportes por Hora (para reportes diarios)
  const getHourlyRevenue = useCallback((startDate, endDate) => {
    return fetchReport('revenue', 'hour', startDate, endDate);
  }, [fetchReport]);

  const getHourlyOccupancy = useCallback((startDate, endDate) => {
    return fetchReport('occupancy', 'hour', startDate, endDate);
  }, [fetchReport]);

  // Reportes Diarios (por día)
  const getDailyRevenue = useCallback((startDate, endDate) => {
    return fetchReport('revenue', 'day', startDate, endDate);
  }, [fetchReport]);

  const getDailyOccupancy = useCallback((startDate, endDate) => {
    return fetchReport('occupancy', 'day', startDate, endDate);
  }, [fetchReport]);

  const getDailyCheckIns = useCallback((startDate, endDate) => {
    return fetchReport('kpis', 'day', startDate, endDate);
  }, [fetchReport]);

  // Reportes Semanales
  const getWeeklyRevenue = useCallback((startDate, endDate) => {
    return fetchReport('revenue', 'week', startDate, endDate);
  }, [fetchReport]);

  const getWeeklyOccupancy = useCallback((startDate, endDate) => {
    return fetchReport('occupancy', 'week', startDate, endDate);
  }, [fetchReport]);

  const getWeeklyCheckIns = useCallback((startDate, endDate) => {
    return fetchReport('kpis', 'week', startDate, endDate);
  }, [fetchReport]);

  // Reportes Mensuales
  const getMonthlyRevenue = useCallback((startDate, endDate) => {
    return fetchReport('revenue', 'month', startDate, endDate);
  }, [fetchReport]);

  const getMonthlyOccupancy = useCallback((startDate, endDate) => {
    return fetchReport('occupancy', 'month', startDate, endDate);
  }, [fetchReport]);

  const getMonthlyCheckIns = useCallback((startDate, endDate) => {
    return fetchReport('kpis', 'month', startDate, endDate);
  }, [fetchReport]);

  // Reportes Anuales
  const getYearlyRevenue = useCallback((startDate, endDate) => {
    return fetchReport('revenue', 'year', startDate, endDate);
  }, [fetchReport]);

  const getYearlyOccupancy = useCallback((startDate, endDate) => {
    return fetchReport('occupancy', 'year', startDate, endDate);
  }, [fetchReport]);

  const getYearlyCheckIns = useCallback((startDate, endDate) => {
    return fetchReport('kpis', 'year', startDate, endDate);
  }, [fetchReport]);

  // Reportes de Clientes
  const getTopClients = useCallback(async (startDate, endDate, limit = 5) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      params.append('metric', 'revenue');
      params.append('limit', limit);
      
      const url = `${API_URL}/reports/rankings/top-clients?${params.toString()}`;
      const response = await axios.get(url, getAuthHeaders());
      setLoading(false);
      return { data: response.data.data || [] };
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Error al obtener top clientes';
      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  }, []);

  const getClientStats = useCallback(async (startDate, endDate) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      
      const url = `${API_URL}/reports/clients/stats?${params.toString()}`;
      const response = await axios.get(url, getAuthHeaders());
      setLoading(false);
      return { data: response.data.data || {} };
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Error al obtener estadísticas de clientes';
      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  }, []);

  // Reportes de Habitaciones
  const getRoomTypeStats = useCallback(async (startDate, endDate) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      params.append('metric', 'revenue');
      
      const url = `${API_URL}/reports/rankings/top-room-types?${params.toString()}`;
      const response = await axios.get(url, getAuthHeaders());
      setLoading(false);
      return { data: response.data.data || [] };
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Error al obtener tipos de habitación';
      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  }, []);

  // Obtener total de paid_amount
  const getTotalPaidAmount = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_URL}/reports/total-paid`;
      const response = await axios.get(url, getAuthHeaders());
      setLoading(false);
      return { data: response.data.data || {} };
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Error al obtener total de pagos';
      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  }, []);

  // ============================================
  // REPORTES PERSONALIZADOS
  // ============================================

  // Reporte personalizado de cliente
  const getClientCustomReport = useCallback(async (clientId, startDate, endDate) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      
      const url = `${API_URL}/reports/client/${clientId}/custom?${params.toString()}`;
      const response = await axios.get(url, getAuthHeaders());
      setLoading(false);
      return { data: response.data.data || {} };
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Error al obtener reporte de cliente';
      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  }, []);

  // Reporte personalizado de habitación
  const getRoomCustomReport = useCallback(async (roomId, startDate, endDate) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      
      const url = `${API_URL}/reports/room/${roomId}/custom?${params.toString()}`;
      const response = await axios.get(url, getAuthHeaders());
      setLoading(false);
      return { data: response.data.data || {} };
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Error al obtener reporte de habitación';
      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  }, []);

  // Reporte personalizado de tipo de habitación
  const getRoomTypeCustomReport = useCallback(async (roomTypeId, startDate, endDate) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      
      const url = `${API_URL}/reports/room-type/${roomTypeId}/custom?${params.toString()}`;
      const response = await axios.get(url, getAuthHeaders());
      setLoading(false);
      return { data: response.data.data || {} };
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Error al obtener reporte de tipo';
      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  }, []);

  // Top clientes por ingresos
  const getTopClientsRevenue = useCallback(async (startDate, endDate, limit = 50) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      params.append('limit', limit.toString());
      
      const url = `${API_URL}/reports/clients/top-revenue?${params.toString()}`;
      const response = await axios.get(url, getAuthHeaders());
      setLoading(false);
      return { data: response.data.data || {} };
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Error al obtener ranking de clientes';
      setError(errorMessage);
      setLoading(false);
      throw new Error(errorMessage);
    }
  }, []);

  return {
    loading,
    error,
    // Reportes Diarios
    getHourlyRevenue,
    getHourlyOccupancy,
    getDailyRevenue,
    getDailyOccupancy,
    getDailyCheckIns,
    // Reportes Semanales
    getWeeklyRevenue,
    getWeeklyOccupancy,
    getWeeklyCheckIns,
    // Reportes Mensuales
    getMonthlyRevenue,
    getMonthlyOccupancy,
    getMonthlyCheckIns,
    // Reportes Anuales
    getYearlyRevenue,
    getYearlyOccupancy,
    getYearlyCheckIns,
    // Reportes de Clientes
    getTopClients,
    getClientStats,
    // Reportes de Habitaciones
    getRoomTypeStats,
    getTotalPaidAmount,
    // Reportes Personalizados
    getClientCustomReport,
    getRoomCustomReport,
    getRoomTypeCustomReport,
    getTopClientsRevenue,
    // Total Pagado
    getTotalPaidAmount,
  };
};
