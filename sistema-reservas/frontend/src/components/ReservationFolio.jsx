import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Home,
  DollarSign,
  CreditCard,
  Printer,
  Plus,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from './ui/Button';

/**
 * ReservationFolio Component
 *
 * Muestra el desglose completo de cargos de una reserva (habitaciones + servicios + cargos manuales + IVA)
 *
 * @param {Object} props
 * @param {number} props.reservationId - ID de la reserva
 * @param {boolean} props.editable - Si se pueden agregar cargos manuales y registrar pagos (default: true)
 * @param {Function} props.onChargeAdded - Callback cuando se agrega un cargo manual
 * @param {Function} props.onPaymentRegistered - Callback cuando se registra un pago
 */
const ReservationFolio = ({
  reservationId,
  editable = true,
  onChargeAdded,
  onPaymentRegistered,
}) => {
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReservationData();
  }, [reservationId]);

  const fetchReservationData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3001/api/v1/reservations/${reservationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al cargar la información de la reserva');
      }

      const data = await response.json();
      setReservation(data.reservation || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Formatear montos en pesos chilenos
  const formatCLP = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Calcular número de noches
  const calculateNights = (checkIn, checkOut) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Cargando folio...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
        <AlertCircle className="w-5 h-5 text-destructive" />
        <span className="text-sm text-destructive">{error}</span>
      </div>
    );
  }

  // Empty state
  if (!reservation) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No se encontró información de la reserva</p>
      </div>
    );
  }

  // Calcular totales
  const nights = calculateNights(reservation.check_in_date, reservation.check_out_date);
  const subtotalRooms = reservation.reservation_rooms?.reduce(
    (sum, rr) => sum + parseFloat(rr.subtotal || 0),
    0
  ) || 0;

  // Servicios desde reservation_services
  const subtotalServices = reservation.reservation_services?.reduce(
    (sum, rs) => sum + parseFloat(rs.quantity || 0) * parseFloat(rs.unit_price || 0),
    0
  ) || 0;

  // Cargos manuales (additional_charges con deleted_at = null)
  const manualCharges = (reservation.additional_charges || []).filter(
    (charge) => !charge.deleted_at
  );
  const subtotalManualCharges = manualCharges.reduce(
    (sum, charge) => sum + parseFloat(charge.subtotal || 0),
    0
  );

  const total = subtotalRooms + subtotalServices + subtotalManualCharges;
  const paid = parseFloat(reservation.paid_amount || 0);
  const pending = total - paid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 text-lg font-semibold text-foreground border-b pb-3">
        <Receipt className="w-5 h-5" />
        Folio de Reserva
      </div>

      {/* 1. Cargos de Habitaciones */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Home className="w-4 h-4" />
          Habitaciones
        </div>
        <div className="space-y-2 pl-6">
          {reservation.reservation_rooms?.map((rr, index) => {
            const pricePerNight = parseFloat(rr.rooms?.base_price || 0);
            return (
              <div key={index} className="text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground">
                    Habitación {rr.rooms?.room_number} ({rr.rooms?.room_types?.name}) - {nights}{' '}
                    {nights === 1 ? 'noche' : 'noches'}
                  </span>
                  <span className="font-medium">{formatCLP(rr.subtotal)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {nights} × {formatCLP(pricePerNight)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Cargos de Servicios */}
      {reservation.reservation_services && reservation.reservation_services.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Receipt className="w-4 h-4" />
            Servicios
          </div>
          <div className="space-y-2 pl-6">
            {reservation.reservation_services.map((rs, index) => {
              const totalCost = parseFloat(rs.quantity || 0) * parseFloat(rs.unit_price || 0);

              return (
                <div key={index} className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-foreground">
                      {rs.services?.name}
                    </span>
                    <span className="font-medium">{formatCLP(totalCost)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {rs.quantity} unidades × {formatCLP(rs.unit_price)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Cargos Manuales */}
      {manualCharges.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <DollarSign className="w-4 h-4" />
            Cargos Adicionales
          </div>
          <div className="space-y-2 pl-6">
            {manualCharges.map((charge, index) => {
              const chargeLabels = {
                minibar: 'Minibar',
                room_damage: 'Daño a habitación',
                extra_service: 'Servicio adicional',
                penalty: 'Penalización',
                other: 'Otro',
              };

              return (
                <div key={index} className="text-sm">
                  <div className="flex justify-between">
                    <span className="text-foreground">
                      {chargeLabels[charge.charge_type] || charge.charge_type}
                      {charge.rooms?.room_number && ` - Hab. ${charge.rooms.room_number}`}
                    </span>
                    <span className="font-medium text-orange-600">
                      +{formatCLP(charge.subtotal)}
                    </span>
                  </div>
                  {charge.description && (
                    <div className="text-xs text-muted-foreground">{charge.description}</div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {charge.quantity} × {formatCLP(charge.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Cálculo Final */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-lg font-bold text-foreground">
          <span>Total:</span>
          <span>{formatCLP(total)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold text-green-600">
          <span>Pagado:</span>
          <span>{formatCLP(paid)}</span>
        </div>
        <div
          className={`flex justify-between text-lg font-bold pt-2 border-t ${
            pending > 0 ? 'text-destructive' : 'text-green-600'
          }`}
        >
          <span>Pendiente:</span>
          <span>{formatCLP(pending)}</span>
        </div>
      </div>

      {/* Botones de acción (si editable) */}
      {editable && (
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChargeAdded && onChargeAdded()}
          >
            <Plus className="w-4 h-4" />
            Agregar Cargo Manual
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPaymentRegistered && onPaymentRegistered()}
          >
            <CreditCard className="w-4 h-4" />
            Registrar Pago
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4" />
            Imprimir Folio
          </Button>
        </div>
      )}
    </div>
  );
};

export default ReservationFolio;
