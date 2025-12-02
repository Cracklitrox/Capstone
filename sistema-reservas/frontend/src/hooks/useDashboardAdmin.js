import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

/**
 * Hook personalizado para obtener datos del dashboard administrativo
 * Consume 6 endpoints de reportes de manera paralela
 */
const useDashboardAdmin = (startDate, endDate) => {
  const [data, setData] = useState({
    kpis: null,
    revenue: null,
    occupancy: null,
    topClients: null,
    topRoomTypes: null,
    topServices: null,
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No hay sesión activa');
      }

      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };

      // Construir parámetros de fecha
      const dateParams = new URLSearchParams({
        startDate: startDate,
        endDate: endDate,
      });

      // Ejecutar todas las peticiones en paralelo
      const [
        kpisResponse,
        revenueResponse,
        occupancyResponse,
        topClientsResponse,
        topRoomTypesResponse,
        topServicesResponse,
      ] = await Promise.all([
        // 1. KPIs Principales
        axios.get(
          `${API_URL}/reports/kpis?${dateParams}&compareWithPrevious=true`,
          config
        ),
        
        // 2. Tendencia de Ingresos (por semana)
        axios.get(
          `${API_URL}/reports/revenue?${dateParams}&groupBy=week&includeServices=true`,
          config
        ),
        
        // 3. Ocupación Diaria
        axios.get(
          `${API_URL}/reports/occupancy?${dateParams}&groupBy=day`,
          config
        ),
        
        // 4. Top Clientes (CON filtro de fechas)
        axios.get(
          `${API_URL}/reports/rankings/top-clients?${dateParams}&metric=revenue&limit=50`,
          config
        ),
        
        // 5. Ranking por Tipo de Habitación
        axios.get(
          `${API_URL}/reports/rankings/top-room-types?${dateParams}&metric=revenue`,
          config
        ),

        // 6. Top Servicios Adicionales
        axios.get(
          `${API_URL}/reports/rankings/top-services?${dateParams}`,
          config
        ),
      ]);

      // Validar respuestas
      if (!kpisResponse.data.success) throw new Error('Error al cargar KPIs');
      if (!revenueResponse.data.success) throw new Error('Error al cargar ingresos');
      if (!occupancyResponse.data.success) throw new Error('Error al cargar ocupación');
      if (!topClientsResponse.data.success) throw new Error('Error al cargar clientes');
      if (!topRoomTypesResponse.data.success) throw new Error('Error al cargar tipos de habitación');
      if (!topServicesResponse.data.success) throw new Error('Error al cargar servicios');

      setData({
        kpis: kpisResponse.data.data,
        revenue: revenueResponse.data.data,
        occupancy: occupancyResponse.data.data,
        topClients: topClientsResponse.data.data,
        topRoomTypes: topRoomTypesResponse.data.data,
        topServices: topServicesResponse.data.data,
      });

      setLastUpdate(new Date());
      setError(null);

    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al cargar el dashboard');
      setData({
        kpis: null,
        revenue: null,
        occupancy: null,
        topClients: null,
        topRoomTypes: null,
        topServices: null,
      });
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  // Ejecutar fetch cuando cambien las fechas
  useEffect(() => {
    if (startDate && endDate) {
      fetchReports();
    }
  }, [startDate, endDate, fetchReports]);

  // Función para refrescar manualmente
  const refresh = useCallback(() => {
    fetchReports();
  }, [fetchReports]);

  return {
    data,
    loading,
    error,
    lastUpdate,
    refresh,
  };
};

export default useDashboardAdmin;
