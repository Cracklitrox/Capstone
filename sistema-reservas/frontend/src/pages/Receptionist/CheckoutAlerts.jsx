import React, { useState, useEffect } from "react";
import { useAuth } from "../../services/authContext";
import { fetchCheckoutAlerts } from "../../services/notifications";
import CheckoutAlertCard from "../../components/CheckoutAlertCard";
import { Card, CardContent } from "@/components/ui/Card";
import { BellIcon, ArrowPathIcon, ClockIcon } from "@heroicons/react/24/outline";

/**
 * Página de Notificaciones de Check-out para Recepcionistas
 * Muestra todas las habitaciones con check-out programado para hoy
 */
function CheckoutAlerts() {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [currentTime, setCurrentTime] = useState(null);

  // Función para cargar las alertas
  const loadAlerts = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchCheckoutAlerts(token);
      setAlerts(response.data || []);
      setCurrentTime(response.currentTime);
      setLastUpdate(new Date().toLocaleTimeString('es-CL'));
    } catch (err) {
      setError(err.message || 'Error al cargar las notificaciones');
      console.error('Error al cargar alertas:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Cargar alertas al montar el componente
  useEffect(() => {
    if (token) {
      loadAlerts();
    }
  }, [token, loadAlerts]);

  // Auto-refresh cada 10 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      if (token) {
        loadAlerts();
      }
    }, 10 * 60 * 1000); // 10 minutos

    return () => clearInterval(interval);
  }, [token, loadAlerts]);

  // Manejador de click en habitación (opcional)
  const handleRoomClick = (roomId) => {
    console.log('Ver detalles de habitación:', roomId);
    // Aquí podrías navegar a la página de detalles de la habitación
    // o abrir un modal con más información
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando notificaciones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <BellIcon className="h-8 w-8 text-orange-500" />
          Notificaciones de Check-out
        </h1>
        <Card className="border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive font-semibold">Error: {error}</p>
            <button
              onClick={loadAlerts}
              className="mt-4 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
            >
              Reintentar
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <BellIcon className="h-8 w-8 text-orange-500" />
            Notificaciones de Check-out
          </h1>
          <p className="text-muted-foreground mt-2">
            Habitaciones con check-out programado para hoy
          </p>
        </div>
        <button
          onClick={loadAlerts}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
          disabled={loading}
        >
          <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Información de última actualización */}
      {lastUpdate && currentTime && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Última actualización: {lastUpdate}
                </span>
              </div>
              <div className="text-muted-foreground">
                Fecha Chile: {currentTime.date} • Hora: {currentTime.time}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resumen de alertas */}
      <Card className={alerts.length > 0 ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' : ''}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Check-outs Hoy</p>
              <p className="text-4xl font-bold text-foreground mt-1">
                {alerts.length}
              </p>
            </div>
            {alerts.length > 0 && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Hora límite</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  11:00 AM
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de alertas */}
      {alerts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {alerts.map((alert) => (
            <CheckoutAlertCard
              key={alert.reservationId}
              alert={alert}
              onRoomClick={handleRoomClick}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <BellIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-xl font-semibold text-foreground mb-2">
              No hay check-outs programados para hoy
            </p>
            <p className="text-muted-foreground">
              Todas las habitaciones están en orden. El sistema se actualiza automáticamente cada 10 minutos.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Información adicional */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Nota:</strong> Esta página se actualiza automáticamente cada 10 minutos. 
            Los check-outs están programados para las 11:00 AM. Recuerda cambiar el estado de las 
            habitaciones a "Limpieza" después de que los huéspedes realicen el check-out.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default CheckoutAlerts;
