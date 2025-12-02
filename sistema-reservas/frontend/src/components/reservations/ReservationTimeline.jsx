import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  CreditCard,
  DollarSign,
  Home,
  User,
  Receipt,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import StatusBadge from '../ui/StatusBadge';

/**
 * ReservationTimeline Component
 *
 * Displays a vertical timeline of all events for a reservation
 *
 * @param {Object} props
 * @param {number} props.reservationId - ID of the reservation
 */
const ReservationTimeline = ({ reservationId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        const response = await fetch(
          `http://localhost:3001/api/v1/reservations/${reservationId}/history`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Error al cargar el historial de la reserva');
        }

        const data = await response.json();
        setHistory(data.history || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (reservationId) {
      fetchHistory();
    }
  }, [reservationId]);

  // Mapeo de iconos según tipo de evento
  const getEventIcon = (event) => {
    // Si es un cambio de estado
    if (event.change_type === 'status_change') {
      return <RefreshCw className="w-4 h-4" />;
    }

    // Detectar tipo de evento por change_type o change_reason
    const reason = (event.change_reason || '').toLowerCase();

    if (reason.includes('pago') || event.change_type === 'payment') {
      return <CreditCard className="w-4 h-4" />;
    }

    if (reason.includes('cargo') || event.change_type === 'charge') {
      return <DollarSign className="w-4 h-4" />;
    }

    if (reason.includes('habitación') || event.change_type === 'room') {
      return <Home className="w-4 h-4" />;
    }

    if (reason.includes('huésped') || event.change_type === 'guest') {
      return <User className="w-4 h-4" />;
    }

    if (reason.includes('servicio') || event.change_type === 'service') {
      return <Receipt className="w-4 h-4" />;
    }

    // Por defecto, cambio de estado
    return <RefreshCw className="w-4 h-4" />;
  };

  // Mapeo de colores según tipo de evento
  const getEventColor = (event) => {
    if (event.change_type === 'status_change' && event.old_value && event.new_value) {
      const positiveTransitions = [
        'pending -> confirmed',
        'confirmed -> ready_for_checkin',
        'ready_for_checkin -> in_progress',
        'in_progress -> pending_checkout',
        'pending_checkout -> completed',
      ];

      const transition = `${event.old_value} -> ${event.new_value}`;

      if (positiveTransitions.some(t => transition.includes(t))) {
        return 'bg-green-500'; // Transición positiva
      }

      if (event.new_value === 'canceled' || event.new_value === 'no_show') {
        return 'bg-red-500'; // Transición negativa
      }

      return 'bg-blue-500'; // Transición neutral
    }

    return 'bg-blue-500'; // Otro tipo de evento
  };

  // Formatear el evento para display
  const formatEvent = (event) => {
    if (event.change_type === 'status_change' && event.old_value && event.new_value) {
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Cambio de estado:</span>
          <StatusBadge status={event.old_value} size="sm" showTooltip={false} />
          <span className="text-muted-foreground">→</span>
          <StatusBadge status={event.new_value} size="sm" showTooltip={false} />
        </div>
      );
    }

    return <span className="text-sm text-foreground">{event.change_reason || 'Evento sin descripción'}</span>;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Cargando historial...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-red-600" />
        <span className="text-sm text-red-800">{error}</span>
      </div>
    );
  }

  // Empty state
  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No hay historial disponible para esta reserva</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Línea vertical conectando eventos */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-secondary" />

      {/* Lista de eventos */}
      <div className="space-y-6">
        {history.map((event, index) => {
          const eventColor = getEventColor(event);
          const eventIcon = getEventIcon(event);
          const user = event.changed_by_user;
          const userName = user
            ? `${user.first_name} ${user.paternal_last_name || ''}`.trim()
            : 'Sistema';
          const userRole = user?.user_roles?.[0]?.roles?.name || 'system';
          const roleLabel = {
            administrator: 'Administrador',
            receptionist: 'Recepcionista',
            guest: 'Huésped',
            system: 'Sistema',
          }[userRole] || userRole;

          return (
            <div key={event.id} className="relative flex gap-4 pl-2">
              {/* Círculo con ícono */}
              <div
                className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full text-white ${eventColor} flex-shrink-0`}
              >
                {eventIcon}
              </div>

              {/* Contenido del evento */}
              <div className="flex-1 pb-4">
                {/* Timestamp relativo */}
                <div className="text-xs text-muted-foreground mb-1">
                  {event.created_at
                    ? formatDistanceToNow(new Date(event.created_at), {
                        addSuffix: true,
                        locale: es,
                      })
                    : 'Fecha no disponible'}
                </div>

                {/* Descripción del evento */}
                <div className="mb-2">{formatEvent(event)}</div>

                {/* Usuario que realizó la acción */}
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">{userName}</span>
                  <span className="text-muted-foreground"> • </span>
                  <span>{roleLabel}</span>
                </div>

                {/* Razón adicional si existe */}
                {event.change_reason && event.change_type === 'status_change' && (
                  <div className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded border border-border">
                    {event.change_reason}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReservationTimeline;
