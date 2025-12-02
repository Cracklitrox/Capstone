import React, { useState, useEffect } from 'react';
import { Loader2, Clock, AlertTriangle } from 'lucide-react';
import StatusBadge from '../../components/ui/StatusBadge';
import QuickCheckOutButton from '@/components/reservations/QuickCheckOutButton';
import ReservationDetailsModal from '@/components/reservations/ReservationDetailsModal';
import { toast } from 'sonner';

/**
 * CheckoutsToday Page
 *
 * Página para gestionar check-outs del día
 */
const CheckoutsToday = () => {
  const [reservations, setReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchCheckouts();
    markCheckoutAlertsAsViewed(); // Marcar alertas como vistas al cargar la página
    const interval = setInterval(fetchCheckouts, 300000); // 5 min
    return () => clearInterval(interval);
  }, []);

  // Marcar alertas de checkout como vistas
  const markCheckoutAlertsAsViewed = async () => {
    try {
      const token = localStorage.getItem('token');
      // Temporalmente deshabilitado debido a error 500 - investigar más adelante
      /* 
      const response = await fetch(
        'http://localhost:3001/api/v1/notifications/checkout-alerts/mark-viewed',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      if (response.ok) {
        // Emitir evento para actualizar contador
        window.dispatchEvent(new Event('checkoutAlertsCleared'));
      }
      */
    } catch (error) {
      // Silently fail - this is not critical for viewing checkouts
      console.warn('Could not mark checkout alerts as viewed:', error);
    }
  };

  const fetchCheckouts = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');

      // Usar el nuevo endpoint dedicado que ya filtra por fecha en el backend
      const response = await fetch(
        'http://localhost:3001/api/v1/reservations/checkouts-today',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error('Error al cargar check-outs');
      }

      const data = await response.json();

      // El backend ya retorna solo las reservas de hoy, no necesitamos filtrar más
      setReservations(data.reservations || []);
    } catch (error) {
      toast.error('Error al cargar check-outs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (reservationId) => {
    // Usar datos ya cargados en lugar de hacer nuevo fetch
    const reservation = reservations.find(r => r.id === reservationId);
    if (reservation) {
      setSelectedReservation(reservation);
      setIsModalOpen(true);
    } else {
      toast.error('Reserva no encontrada');
    }
  };

  const formatCLP = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTimeRemaining = () => {
    const now = new Date();
    const checkoutDeadline = new Date();
    checkoutDeadline.setHours(11, 0, 0, 0); // 11:00 AM

    const diff = checkoutDeadline - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (diff < 0) {
      return { text: 'Pasado el límite', color: 'text-red-600', urgent: true };
    } else if (hours < 1) {
      return {
        text: `${minutes} minutos`,
        color: 'text-red-600',
        urgent: true,
      };
    } else if (hours < 2) {
      return { text: `${hours}h ${minutes}m`, color: 'text-yellow-700 dark:text-yellow-400', urgent: false };
    } else {
      return { text: `${hours}h ${minutes}m`, color: 'text-green-700 dark:text-green-400', urgent: false };
    }
  };

  const timeRemaining = getTimeRemaining();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Cargando check-outs...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Check-outs Hoy</h1>
        <p className="text-muted-foreground">
          {reservations.length} check-out(s) pendiente(s)
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Clock className="w-4 h-4" />
          <span className="text-sm">
            Hora límite: <strong>11:00 AM</strong>
          </span>
          <span className={`text-sm font-medium ${timeRemaining.color}`}>
            (Tiempo restante: {timeRemaining.text})
          </span>
        </div>
      </div>

      {/* Grid de Cards */}
      {reservations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="bg-muted/50 rounded-full p-6 mb-4">
            <Clock className="w-16 h-16 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            No hay check-outs pendientes
          </h3>
          <p className="text-muted-foreground text-center max-w-md">
            No hay reservas programadas para hacer check-out el día de hoy.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reservations.map((reservation) => {
            const guestName = reservation.main_guest
              ? `${reservation.main_guest.first_name} ${reservation.main_guest.last_name_father || ''}`
              : 'N/A';

            const isPaidFully =
              reservation.paid_amount >= reservation.total_amount;
            const pendingAmount = reservation.total_amount - reservation.paid_amount;

            return (
              <div
                key={reservation.id}
                className={`bg-card rounded-lg p-4 space-y-3 ${timeRemaining.urgent
                  ? 'border-2 border-red-400 dark:border-red-500'
                  : 'border-2 border-orange-300 dark:border-orange-400'
                  }`}
              >
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-lg font-bold">{reservation.code}</p>
                    <p className="text-sm text-muted-foreground">{guestName}</p>
                  </div>
                  <StatusBadge status={reservation.status} size="sm" />
                </div>

                {/* Habitaciones */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Habitaciones:</p>
                  <div className="flex flex-wrap gap-1">
                    {reservation.reservation_rooms?.map((rr, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-200 text-xs rounded font-medium border border-yellow-300 dark:border-yellow-700"
                      >
                        #{rr.rooms?.room_number}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Estado de pago */}
                <div className="bg-muted p-3 rounded">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-semibold">
                      {formatCLP(reservation.total_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Pagado:</span>
                    <span className="font-semibold text-green-700 dark:text-green-400">
                      {formatCLP(reservation.paid_amount)}
                    </span>
                  </div>
                  {!isPaidFully && (
                    <div className="hidden"></div>
                  )}
                </div>

                {/* Botones */}
                <div className="space-y-2 pt-2">
                  <QuickCheckOutButton
                    reservationId={reservation.id}
                    isPaidFully={isPaidFully}
                    pendingAmount={pendingAmount}
                    totalAmount={reservation.total_amount}
                    paidAmount={reservation.paid_amount}
                    guestName={guestName}
                    onSuccess={fetchCheckouts}
                    className="w-full"
                  />
                  <button
                    onClick={() => handleViewDetails(reservation.id)}
                    className="w-full px-3 py-2 text-sm border rounded-md hover:bg-muted"
                  >
                    Ver Detalles
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {selectedReservation && (
        <ReservationDetailsModal
          reservation={selectedReservation}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedReservation(null);
          }}
          onUpdate={() => {
            fetchCheckouts();
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default CheckoutsToday;
