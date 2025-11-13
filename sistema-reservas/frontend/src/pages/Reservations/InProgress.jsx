import React, { useState, useEffect } from 'react';
import { Loader2, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import ReservationDetailsModal from '@/components/ReservationDetailsModal';
import { toast } from 'sonner';

/**
 * InProgress Page
 *
 * Página para gestionar reservas con huéspedes actualmente hospedados
 */
const InProgress = () => {
  const [reservations, setReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [totalRooms, setTotalRooms] = useState(20); // TODO: Obtener del backend

  useEffect(() => {
    fetchInProgress();
    const interval = setInterval(fetchInProgress, 600000); // 10 min
    return () => clearInterval(interval);
  }, []);

  const fetchInProgress = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(
        'http://localhost:3001/api/v1/reservations?status=in_progress',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error('Error al cargar reservas');
      }

      const data = await response.json();
      setReservations(data.reservations || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar reservas en progreso');
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

  const calculateDaysRemaining = (checkOutDate) => {
    const today = new Date();
    const checkOut = new Date(checkOutDate);
    const diff = checkOut - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const occupiedRooms = reservations.reduce(
    (sum, r) => sum + (r.reservation_rooms?.length || 0),
    0
  );
  const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reservas en Progreso</h1>
        <p className="text-muted-foreground">Huéspedes actualmente hospedados</p>
      </div>

      {/* Estadísticas de ocupación */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">Ocupación Actual</p>
            <p className="text-3xl font-bold">
              {occupiedRooms} / {totalRooms} habitaciones
            </p>
            <p className="text-sm opacity-90 mt-1">
              {occupancyRate.toFixed(1)}% de ocupación
            </p>
          </div>
          <div className="text-right">
            <div className="w-24 h-24 rounded-full border-4 border-white flex items-center justify-center">
              <span className="text-2xl font-bold">{occupiedRooms}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Reservas */}
      {reservations.length === 0 ? (
        <div className="text-center py-12 bg-muted rounded-lg border-2 border-dashed">
          <p className="text-muted-foreground">No hay huéspedes hospedados actualmente</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reservations.map((reservation) => {
            const guestName = reservation.main_guest
              ? `${reservation.main_guest.first_name} ${reservation.main_guest.last_name_father || ''}`
              : 'N/A';

            const daysRemaining = calculateDaysRemaining(reservation.check_out_date);

            return (
              <div
                key={reservation.id}
                className="bg-card border-2 border-purple-200 rounded-lg p-4 space-y-3"
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
                  <p className="text-xs text-muted-foreground mb-1">Habitaciones Ocupadas:</p>
                  <div className="flex flex-wrap gap-1">
                    {reservation.reservation_rooms?.map((rr, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded font-medium"
                      >
                        #{rr.rooms?.room_number} - {rr.rooms?.room_type?.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tiempo restante */}
                <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div className="text-sm">
                    <p className="text-muted-foreground">
                      {daysRemaining > 0
                        ? `${daysRemaining} día(s) restante(s)`
                        : 'Check-out hoy'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Check-out: {new Date(reservation.check_out_date).toLocaleDateString('es-CL')}
                    </p>
                  </div>
                </div>

                {/* Folio parcial */}
                <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded">
                  <DollarSign className="w-4 h-4 text-yellow-700" />
                  <div className="text-sm">
                    <p className="text-gray-700 font-medium">
                      Folio: {formatCLP(reservation.total_amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pagado: {formatCLP(reservation.paid_amount)}
                    </p>
                  </div>
                </div>

                {/* Botón ver detalles */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleViewDetails(reservation.id)}
                >
                  Ver Detalles / Gestionar
                </Button>
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
            fetchInProgress();
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default InProgress;
