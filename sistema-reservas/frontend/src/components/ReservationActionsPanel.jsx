import React, { useState } from 'react';
import {
  CreditCard,
  X,
  Flag,
  CheckCircle2,
  Clock,
  DoorOpen,
  Calendar,
  ArrowUp,
  Package,
  DollarSign,
  AlertTriangle,
  Ghost,
} from 'lucide-react';
import { Button } from './ui/Button';
import QuickCheckInButton from './QuickCheckInButton';
import QuickCheckOutButton from './QuickCheckOutButton';
import AddManualChargeModal from './AddManualChargeModal';
import ExtendStayModal from './ExtendStayModal';
import RoomUpgradeModal from './RoomUpgradeModal';
import EarlyCheckoutModal from './EarlyCheckoutModal';
import { toast } from 'sonner';

/**
 * ReservationActionsPanel Component
 *
 * Panel con botones de acciones dinámicos según el estado de la reserva
 *
 * @param {Object} props
 * @param {Object} props.reservation - Datos completos de la reserva
 * @param {Function} props.onActionComplete - Callback al completar cualquier acción
 */
const ReservationActionsPanel = ({ reservation, onActionComplete }) => {
  const [isAddChargeModalOpen, setIsAddChargeModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isEarlyCheckoutModalOpen, setIsEarlyCheckoutModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Extraer datos de la reserva
  const {
    id: reservationId,
    status,
    paid_amount = 0,
    total_amount = 0,
    main_guest,
    reservation_rooms = [],
  } = reservation || {};

  const isPaidFully = paid_amount >= total_amount;
  const pendingAmount = total_amount - paid_amount;
  const guestName = main_guest
    ? `${main_guest.first_name} ${main_guest.last_name_father || ''}`
    : 'Huésped';

  // Formatear montos
  const formatCLP = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Handler genérico para cambios de estado
  const handleStatusChange = async (newStatus, reason = '') => {
    try {
      setIsLoading(true);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3001/api/v1/reservations/${reservationId}/status`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            newStatus,
            reason: reason || `Cambio a estado ${newStatus}`,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al cambiar estado');
      }

      const data = await response.json();

      toast.success('Estado actualizado exitosamente', {
        description: `Reserva cambiada a ${newStatus}`,
      });

      if (onActionComplete) {
        onActionComplete(data.reservation);
      }
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      toast.error('Error al cambiar estado', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handler para confirmar pago de transferencia
  const handleConfirmPayment = async () => {
    try {
      setIsLoading(true);

      const token = localStorage.getItem('token');

      // Primero obtener pagos pendientes
      const paymentsResponse = await fetch(
        `http://localhost:3001/api/v1/reservations/${reservationId}/payments`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!paymentsResponse.ok) {
        throw new Error('Error al obtener pagos');
      }

      const paymentsData = await paymentsResponse.json();
      const pendingPayments = paymentsData.payments?.filter(
        (p) => p.status === 'pending'
      );

      if (!pendingPayments || pendingPayments.length === 0) {
        throw new Error('No hay pagos pendientes de confirmar');
      }

      // Confirmar el primer pago pendiente
      const paymentId = pendingPayments[0].id;
      const confirmResponse = await fetch(
        `http://localhost:3001/api/v1/reservations/payments/${paymentId}/confirm`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json();
        throw new Error(errorData.message || 'Error al confirmar pago');
      }

      toast.success('Pago confirmado exitosamente', {
        description: 'La reserva ha sido actualizada',
      });

      if (onActionComplete) {
        onActionComplete();
      }
    } catch (error) {
      console.error('Error al confirmar pago:', error);
      toast.error('Error al confirmar pago', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handler para cancelar reserva
  const handleCancelReservation = () => {
    const reason = prompt(
      'Ingrese la razón de la cancelación:'
    );
    if (reason) {
      handleStatusChange('canceled', reason);
    }
  };

  // Handler para early checkout con modal
  const handleEarlyCheckoutConfirm = async (data) => {
    try {
      setIsLoading(true);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3001/api/v1/reservations/${reservationId}/early-checkout`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason: data.reason,
            checkoutDateTime: data.checkoutDateTime,
            daysUsed: data.calculation.daysUsed,
            unusedDays: data.calculation.unusedDays,
            adjustmentAmount: data.calculation.unusedAmount,
            newTotal: data.calculation.newTotal,
            chargesCurrentDay: data.calculation.chargesCurrentDay,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al realizar salida anticipada');
      }

      toast.success('Salida anticipada procesada exitosamente', {
        description: `Ajuste de ${new Intl.NumberFormat('es-CL', {
          style: 'currency',
          currency: 'CLP',
          minimumFractionDigits: 0,
        }).format(data.calculation.unusedAmount)} realizado`
      });

      setIsEarlyCheckoutModalOpen(false);

      if (onActionComplete) {
        onActionComplete();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al realizar salida anticipada', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLateCheckout = async () => {
    const reason = prompt('Ingrese la razón del late checkout:');
    if (!reason) return;

    const chargeAmount = prompt('Ingrese el monto del cargo (opcional, 0 para sin cargo):');
    const charge = chargeAmount ? parseFloat(chargeAmount) : 0;

    try {
      setIsLoading(true);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3001/api/v1/reservations/${reservationId}/late-checkout`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason, chargeAmount: charge }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al realizar late checkout');
      }

      toast.success('Late checkout autorizado exitosamente');

      if (onActionComplete) {
        onActionComplete();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al realizar late checkout', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handler para no-show
  const handleNoShow = () => {
    if (confirm(`¿Confirma marcar como NO-SHOW a ${guestName}?`)) {
      handleStatusChange('no_show', 'Huésped no se presentó');
    }
  };

  // Renderizar botones según estado actual
  const renderActionsByStatus = () => {
    switch (status) {
      case 'pending':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Acciones disponibles para reserva <strong>pendiente</strong>:
            </p>
            <Button
              onClick={handleConfirmPayment}
              disabled={isLoading}
              className="w-full"
            >
              <CreditCard className="w-4 h-4" />
              Confirmar Pago Transferencia
            </Button>
            <Button
              onClick={handleCancelReservation}
              disabled={isLoading}
              variant="destructive"
              className="w-full"
            >
              <X className="w-4 h-4" />
              Cancelar por Falta de Pago
            </Button>
          </div>
        );

      case 'confirmed':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Acciones disponibles para reserva <strong>confirmada</strong>:
            </p>
            <Button
              onClick={() => handleStatusChange('ready_for_checkin', 'Preparando para check-in')}
              disabled={isLoading}
              className="w-full"
            >
              <Flag className="w-4 h-4" />
              Marcar Ready for Check-in
            </Button>
            <Button
              onClick={handleCancelReservation}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              <X className="w-4 h-4" />
              Cancelar Reserva
            </Button>
          </div>
        );

      case 'ready_for_checkin':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Acciones disponibles para <strong>ready for check-in</strong>:
            </p>
            <QuickCheckInButton
              reservationId={reservationId}
              requireFullPayment={false}
              currentPaidAmount={paid_amount}
              totalAmount={total_amount}
              guestName={guestName}
              onSuccess={onActionComplete}
              className="w-full"
            />
            <Button
              onClick={handleCancelReservation}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              <X className="w-4 h-4" />
              Cancelar Reserva
            </Button>
            <Button
              onClick={handleNoShow}
              disabled={isLoading}
              variant="destructive"
              className="w-full"
            >
              <Ghost className="w-4 h-4" />
              Marcar No-Show
            </Button>
          </div>
        );

      case 'in_progress':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Acciones disponibles para huésped <strong>hospedado</strong>:
            </p>
            <Button
              onClick={() =>
                handleStatusChange('pending_checkout', 'Preparando para check-out')
              }
              disabled={isLoading}
              className="w-full"
            >
              <DoorOpen className="w-4 h-4" />
              Preparar para Check-out
            </Button>
            <Button
              onClick={() => setIsExtendModalOpen(true)}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              <Calendar className="w-4 h-4" />
              Extender Estadía
            </Button>
            <Button
              onClick={() => setIsUpgradeModalOpen(true)}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              <ArrowUp className="w-4 h-4" />
              Mejorar Habitación
            </Button>
            <Button
              onClick={() => setIsAddChargeModalOpen(true)}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              <DollarSign className="w-4 h-4" />
              Agregar Cargo Manual
            </Button>
            <Button
              onClick={() => setIsEarlyCheckoutModalOpen(true)}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              <AlertTriangle className="w-4 h-4" />
              Salida Anticipada
            </Button>
          </div>
        );

      case 'pending_checkout':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Acciones disponibles para <strong>check-out pendiente</strong>:
            </p>
            <QuickCheckOutButton
              reservationId={reservationId}
              isPaidFully={isPaidFully}
              pendingAmount={pendingAmount}
              totalAmount={total_amount}
              paidAmount={paid_amount}
              guestName={guestName}
              onSuccess={onActionComplete}
              className="w-full"
            />
            <Button
              onClick={handleLateCheckout}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              <Clock className="w-4 h-4" />
              Autorizar Late Check-out
            </Button>
            {!isPaidFully && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-800 font-medium">
                      Pago incompleto
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Pendiente: {formatCLP(pendingAmount)}. Se debe registrar el pago
                      antes de realizar el check-out.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'completed':
      case 'canceled':
      case 'no_show':
        return (
          <div className="p-4 bg-muted border border-border rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              No hay acciones disponibles para reservas con estado{' '}
              <strong>{status}</strong>.
            </p>
          </div>
        );

      default:
        return (
          <div className="p-4 bg-muted border border-border rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              Estado desconocido: <strong>{status}</strong>
            </p>
          </div>
        );
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Información de pago (siempre visible) */}
        <div className="bg-muted p-3 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground mb-2">Estado de pago:</p>
          <div className="flex justify-between text-sm">
            <span>Total:</span>
            <span className="font-semibold">{formatCLP(total_amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Pagado:</span>
            <span className="font-semibold text-green-600">
              {formatCLP(paid_amount)}
            </span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-border mt-2">
            <span className="font-medium">Pendiente:</span>
            <span
              className={`font-bold ${
                pendingAmount > 0 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {formatCLP(pendingAmount)}
            </span>
          </div>
        </div>

        {/* Botones dinámicos según estado */}
        {renderActionsByStatus()}
      </div>

      {/* Modales */}
      <AddManualChargeModal
        reservationId={reservationId}
        rooms={reservation_rooms.map((rr) => ({
          id: rr.rooms?.id,
          room_number: rr.rooms?.room_number,
          room_types: rr.rooms?.room_types,
        }))}
        isOpen={isAddChargeModalOpen}
        onClose={() => setIsAddChargeModalOpen(false)}
        onSuccess={onActionComplete}
      />

      <ExtendStayModal
        reservation={reservation}
        isOpen={isExtendModalOpen}
        onClose={() => setIsExtendModalOpen(false)}
        onSuccess={onActionComplete}
      />

      <RoomUpgradeModal
        reservation={reservation}
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onSuccess={onActionComplete}
      />

      <EarlyCheckoutModal
        isOpen={isEarlyCheckoutModalOpen}
        onClose={() => setIsEarlyCheckoutModalOpen(false)}
        onConfirm={handleEarlyCheckoutConfirm}
        reservation={reservation}
      />
    </>
  );
};

export default ReservationActionsPanel;
