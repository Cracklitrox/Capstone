import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { fetchCheckoutAlerts, fetchPastCheckouts, fetchFutureCheckouts } from '../../services/notifications';
import CheckoutAlertCardImproved from '@/components/notifications/CheckoutAlertCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import { CalendarClock, History, CalendarDays, Loader2 } from 'lucide-react';

export default function CheckoutAlertsImproved() {
  const { token } = useAuth();
  const [todayAlerts, setTodayAlerts] = useState([]);
  const [pastCheckouts, setPastCheckouts] = useState([]);
  const [futureCheckouts, setFutureCheckouts] = useState([]);
  const [loading, setLoading] = useState({ today: true, past: false, future: false });
  const [error, setError] = useState({ today: null, past: null, future: null });
  const [lastUpdate, setLastUpdate] = useState({ today: null, past: null, future: null });
  const [activeTab, setActiveTab] = useState('today');

  // Cargar alertas de hoy
  const loadTodayAlerts = useCallback(async () => {
    if (!token) return;

    try {
      setLoading((prev) => ({ ...prev, today: true }));
      setError((prev) => ({ ...prev, today: null }));

      const response = await fetchCheckoutAlerts(token);
      setTodayAlerts(response.data || []);
      setLastUpdate((prev) => ({ ...prev, today: new Date() }));
    } catch (err) {
      setError((prev) => ({ ...prev, today: err.message }));
    } finally {
      setLoading((prev) => ({ ...prev, today: false }));
    }
  }, [token]);

  // Cargar checkouts pasados
  const loadPastCheckouts = useCallback(async () => {
    if (!token) return;

    try {
      setLoading((prev) => ({ ...prev, past: true }));
      setError((prev) => ({ ...prev, past: null }));

      const response = await fetchPastCheckouts(token, 7); // Últimos 7 días
      setPastCheckouts(response.data || []);
      setLastUpdate((prev) => ({ ...prev, past: new Date() }));
    } catch (err) {
      setError((prev) => ({ ...prev, past: err.message }));
    } finally {
      setLoading((prev) => ({ ...prev, past: false }));
    }
  }, [token]);

  // Cargar checkouts futuros
  const loadFutureCheckouts = useCallback(async () => {
    if (!token) return;

    try {
      setLoading((prev) => ({ ...prev, future: true }));
      setError((prev) => ({ ...prev, future: null }));

      const response = await fetchFutureCheckouts(token, 7); // Próximos 7 días
      setFutureCheckouts(response.data || []);
      setLastUpdate((prev) => ({ ...prev, future: new Date() }));
    } catch (err) {
      setError((prev) => ({ ...prev, future: err.message }));
    } finally {
      setLoading((prev) => ({ ...prev, future: false }));
    }
  }, [token]);

  // Cargar datos iniciales
  useEffect(() => {
    loadTodayAlerts();
  }, [loadTodayAlerts]);

  // Cargar datos según la pestaña activa
  useEffect(() => {
    if (activeTab === 'past' && pastCheckouts.length === 0 && !loading.past) {
      loadPastCheckouts();
    } else if (activeTab === 'future' && futureCheckouts.length === 0 && !loading.future) {
      loadFutureCheckouts();
    }
  }, [activeTab, pastCheckouts.length, futureCheckouts.length, loading.past, loading.future, loadPastCheckouts, loadFutureCheckouts]);

  // Auto-refresh cada 10 minutos (solo para la pestaña activa)
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'today') {
        loadTodayAlerts();
      } else if (activeTab === 'past') {
        loadPastCheckouts();
      } else if (activeTab === 'future') {
        loadFutureCheckouts();
      }
    }, 10 * 60 * 1000); // 10 minutos

    return () => clearInterval(interval);
  }, [activeTab, loadTodayAlerts, loadPastCheckouts, loadFutureCheckouts]);

  const formatLastUpdate = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // segundos

    if (diff < 60) return 'hace unos segundos';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} minutos`;
    return `hace ${Math.floor(diff / 3600)} horas`;
  };

  const renderContent = (alerts, loadingState, errorState, variant, emptyMessage) => {
    if (loadingState) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Cargando checkouts...</p>
        </div>
      );
    }

    if (errorState) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-red-500">Error: {errorState}</p>
        </div>
      );
    }

    if (alerts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <CalendarClock className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-4">
        {alerts.map((alert) => (
          <CheckoutAlertCardImproved key={alert.reservationId} alert={alert} variant={variant} />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Checkouts</h1>
        <p className="text-muted-foreground">
          Visualiza y gestiona los checkouts de hoy, pasados y futuros
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="today" className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Hoy
            {todayAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {todayAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Pasados (7d)
            {pastCheckouts.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pastCheckouts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="future" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Próximos (7d)
            {futureCheckouts.length > 0 && (
              <Badge variant="outline" className="ml-1">
                {futureCheckouts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Today Tab */}
        <TabsContent value="today" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {lastUpdate.today && `Última actualización: ${formatLastUpdate(lastUpdate.today)}`}
            </p>
            <button
              onClick={loadTodayAlerts}
              className="text-sm text-primary hover:underline"
              disabled={loading.today}
            >
              Actualizar
            </button>
          </div>
          {renderContent(
            todayAlerts,
            loading.today,
            error.today,
            'today',
            'No hay checkouts programados para hoy'
          )}
        </TabsContent>

        {/* Past Tab */}
        <TabsContent value="past" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {lastUpdate.past && `Última actualización: ${formatLastUpdate(lastUpdate.past)}`}
            </p>
            <button
              onClick={loadPastCheckouts}
              className="text-sm text-primary hover:underline"
              disabled={loading.past}
            >
              Actualizar
            </button>
          </div>
          {renderContent(
            pastCheckouts,
            loading.past,
            error.past,
            'past',
            'No hay checkouts en los últimos 7 días'
          )}
        </TabsContent>

        {/* Future Tab */}
        <TabsContent value="future" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {lastUpdate.future && `Última actualización: ${formatLastUpdate(lastUpdate.future)}`}
            </p>
            <button
              onClick={loadFutureCheckouts}
              className="text-sm text-primary hover:underline"
              disabled={loading.future}
            >
              Actualizar
            </button>
          </div>
          {renderContent(
            futureCheckouts,
            loading.future,
            error.future,
            'future',
            'No hay checkouts programados en los próximos 7 días'
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
