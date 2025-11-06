import React, { useState, useEffect } from 'react';
import { Loader2, Clock } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import QuickCheckInButton from '@/components/QuickCheckInButton';
import ReservationDetailsModal from '@/components/ReservationDetailsModal';
import { toast } from 'sonner';

/**
 * CheckinsToday Page
 *
 * Página para gestionar check-ins del día
 */
const CheckinsToday = () => {
  const [reservations, setReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchCheckins();
    const interval = setInterval(fetchCheckins, 300000); // 5 min
    return () => clearInterval(interval);
  }, []);

  const fetchCheckins = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');

      // Filtrar reservas con status=ready_for_checkin y check_in_date=TODAY
      const response = await fetch(
        'http://localhost:3001/api/v1/reservations?status=ready_for_checkin',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error('Error al cargar check-ins');
      }

      const data = await response.json();

      // Obtener fecha actual en zona horaria de Chile (America/Santiago)
      const today = new Date().toLocaleDateString('es-CL', {
        timeZone: 'America/Santiago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).split('-').reverse().join('-'); // De DD-MM-YYYY a YYYY-MM-DD

      console.log('🔍 CheckinsToday - Hoy (Chile):', today);
      console.log('🔍 CheckinsToday - Reservas recibidas:', data.reservations?.length);

      const todayCheckins = (data.reservations || []).filter((r) => {
        const checkInDate = new Date(r.check_in_date).toISOString().split('T')[0];
        console.log(`🔍 CheckinsToday - Comparando: ${checkInDate} === ${today}`, checkInDate === today);
        return checkInDate === today;
      });

      console.log('🔍 CheckinsToday - Check-ins hoy:', todayCheckins.length);
      setReservations(todayCheckins);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar check-ins');
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Cargando check-ins...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Check-ins Hoy</h1>
        <p className="text-muted-foreground">
          {reservations.length} check-in(s) pendiente(s)
        </p>
      </div>

      {/* Grid de Cards */}
      {reservations.length === 0 ? (
        <div className="text-center py-12 bg-green-50 rounded-lg border-2 border-green-200">
          <p className="text-green-800 font-medium">
            ✅ No hay check-ins pendientes para hoy
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

            return (
              <div
                key={reservation.id}
                className="bg-card border-2 border-blue-200 rounded-lg p-4 space-y-3"
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
                        className="px-2 py-1 bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground text-xs rounded font-medium border border-primary/30"
                      >
                        #{rr.rooms?.room_number} - {rr.rooms?.room_type?.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Estado de pago */}
                <div className="bg-muted p-2 rounded">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Pagado:</span>
                    <span className="font-medium">
                      {formatCLP(reservation.paid_amount)}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        isPaidFully ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          (reservation.paid_amount / reservation.total_amount) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Botones */}
                <div className="space-y-2 pt-2">
                  <QuickCheckInButton
                    reservationId={reservation.id}
                    requireFullPayment={false}
                    currentPaidAmount={reservation.paid_amount}
                    totalAmount={reservation.total_amount}
                    guestName={guestName}
                    onSuccess={fetchCheckins}
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
            fetchCheckins();
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default CheckinsToday;
