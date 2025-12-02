import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, Filter, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/Select';
import StatusBadge from '../../components/ui/StatusBadge';
import ReservationDetailsModal from '@/components/reservations/ReservationDetailsModal';
import { ReservationCardSkeleton } from '../../components/ui/Skeleton';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from 'use-debounce';

/**
 * ManageReservations Page
 *
 * P\u00e1gina principal de gesti\u00f3n de reservas
 * Muestra grid de cards con todas las reservas activas
 */
const ManageReservations = () => {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Debounce search term (300ms delay) para reducir renders innecesarios
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  // ============================================================================
  // Memoized Functions (useCallback) - Performance Optimization
  // ============================================================================

  const fetchReservations = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(
        'http://localhost:3001/api/v1/reservations',
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
      toast.error('Error al cargar reservas', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleViewDetails = useCallback((reservationId) => {
    // Usar datos ya cargados en lugar de hacer nuevo fetch
    const reservation = reservations.find(r => r.id === reservationId);
    if (reservation) {
      setSelectedReservation(reservation);
      setIsModalOpen(true);
    } else {
      toast.error('Reserva no encontrada');
    }
  }, [reservations]);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedReservation(null);
  }, []);

  const handleReservationUpdate = useCallback(() => {
    fetchReservations();
    setIsModalOpen(false);
    setSelectedReservation(null);
  }, [fetchReservations]);

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    fetchReservations();
    const interval = setInterval(fetchReservations, 600000); // 10 min
    return () => clearInterval(interval);
  }, [fetchReservations]);

  // ============================================================================
  // Computed Values (useMemo) - Performance Optimization
  // ============================================================================

  // Filtrado de reservas optimizado con useMemo
  // Solo recalcula cuando cambian: reservations, selectedStatus, debouncedSearchTerm
  const filteredReservations = useMemo(() => {
    let filtered = [...reservations];

    // Excluir reservas completadas (ya que esta página es para gestión de reservas activas)
    filtered = filtered.filter((r) => r.status !== 'completed');

    // Eliminar duplicados basándose en el ID de la reserva
    filtered = filtered.reduce((acc, current) => {
      const exists = acc.find(item => item.id === current.id);
      if (!exists) {
        return [...acc, current];
      }
      return acc;
    }, []);

    // Filtrar por estado
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((r) => r.status === selectedStatus);
    }

    // Filtrar por término de búsqueda (debounced para mejor performance)
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.code?.toLowerCase().includes(term) ||
          r.main_guest?.first_name?.toLowerCase().includes(term) ||
          r.main_guest?.last_name_father?.toLowerCase().includes(term) ||
          r.main_guest?.rut?.toLowerCase().includes(term) ||
          r.reservation_rooms?.some((rr) =>
            rr.rooms?.room_number?.toString().includes(term)
          )
      );
    }

    return filtered;
  }, [reservations, selectedStatus, debouncedSearchTerm]);

  const formatCLP = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculateNights = (checkIn, checkOut) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  };

  if (isLoading && reservations.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Todas las Reservas</h1>
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <ReservationCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Todas las Reservas
          </h1>
          <p className="text-muted-foreground">
            {filteredReservations.length} reserva(s) encontrada(s)
          </p>
        </div>
        <Button
          onClick={() => navigate('/reservations/new')}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Nueva Reserva
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 flex-wrap">
        {/* Búsqueda */}
        <div className="flex-1 min-w-[300px]">
          <label htmlFor="search-reservations" className="sr-only">
            Buscar reservas
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="search-reservations"
              type="search"
              placeholder="Buscar por código, RUT, nombre, habitación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              aria-label="Buscar reservas por código, RUT, nombre o habitación"
            />
          </div>
        </div>

        {/* Filtro de estado */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <label htmlFor="filter-status" className="sr-only">
            Filtrar por estado
          </label>
          <Select
            value={selectedStatus}
            onValueChange={setSelectedStatus}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="confirmed">Confirmado</SelectItem>
              <SelectItem value="ready_for_checkin">Ready for Check-in</SelectItem>
              <SelectItem value="in_progress">En Progreso</SelectItem>
              <SelectItem value="pending_checkout">Pending Checkout</SelectItem>
              <SelectItem value="canceled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Live region para screen readers */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {filteredReservations.length} reserva(s) encontrada(s)
      </div>

      {/* Grid de Reservas */}
      {filteredReservations.length === 0 ? (
        <div className="text-center py-12 bg-muted rounded-lg border-2 border-dashed" role="status">
          <p className="text-muted-foreground">No se encontraron reservas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" role="list">
          {filteredReservations.map((reservation) => {
            const guestName = reservation.main_guest
              ? `${reservation.main_guest.first_name} ${reservation.main_guest.last_name_father || ''}`
              : 'N/A';

            const nights = calculateNights(
              reservation.check_in_date,
              reservation.check_out_date
            );

            const paymentProgress =
              reservation.total_amount > 0
                ? Math.min((reservation.paid_amount / reservation.total_amount) * 100, 100)
                : 0;

            return (
              <div
                key={reservation.id}
                role="button"
                tabIndex={0}
                className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                onClick={() => handleViewDetails(reservation.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleViewDetails(reservation.id);
                  }
                }}
                aria-label={`Ver detalles de reserva ${reservation.code} para ${guestName}`}
              >
                {/* Header del card */}
                <div className="flex justify-between items-start mb-3 gap-2">
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-foreground truncate">
                      {reservation.code}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{guestName}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <StatusBadge status={reservation.status} size="sm" />
                  </div>
                </div>

                {/* Habitaciones */}
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">Habitaciones:</p>
                  <div className="flex flex-wrap gap-1">
                    {reservation.reservation_rooms?.map((rr, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-secondary text-secondary-foreground rounded-md text-sm font-medium"
                      >
                        #{rr.rooms?.room_number}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Fechas */}
                <div className="mb-3 text-sm text-muted-foreground">
                  <p>
                    {new Date(reservation.check_in_date).toLocaleDateString('es-CL')}{' '}
                    → {new Date(reservation.check_out_date).toLocaleDateString('es-CL')}
                  </p>
                  <p className="text-xs text-muted-foreground">{nights} noche(s)</p>
                </div>

                {/* Progress bar de pago */}
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Pago</span>
                    <span className="font-medium">
                      {paymentProgress.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${paymentProgress >= 100
                        ? 'bg-green-500'
                        : paymentProgress >= 50
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                        }`}
                      style={{ width: `${paymentProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{formatCLP(reservation.paid_amount)}</span>
                    <span>{formatCLP(reservation.total_amount)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de detalles */}
      {selectedReservation && (
        <ReservationDetailsModal
          reservation={selectedReservation}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onUpdate={handleReservationUpdate}
        />
      )}
    </div>
  );
};

export default ManageReservations;
