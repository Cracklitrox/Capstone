import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/Dialog';
import { toast } from 'sonner';
import * as Tooltip from '@radix-ui/react-tooltip';

/**
 * QuickCheckInButton Component
 *
 * Botón para realizar check-in con validación de pago
 *
 * @param {Object} props
 * @param {number} props.reservationId - ID de la reserva
 * @param {boolean} props.requireFullPayment - Si se requiere pago completo (de system_settings)
 * @param {number} props.currentPaidAmount - Monto pagado actual
 * @param {number} props.totalAmount - Monto total de la reserva
 * @param {string} props.guestName - Nombre del huésped principal
 * @param {Function} props.onSuccess - Callback al completar check-in exitoso
 * @param {string} props.className - Clases CSS adicionales
 */
const QuickCheckInButton = ({
  reservationId,
  requireFullPayment = false,
  currentPaidAmount = 0,
  totalAmount = 0,
  guestName = 'el huésped',
  onSuccess,
  className = '',
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Calcular si el pago está completo
  const isPaidFully = currentPaidAmount >= totalAmount;
  const pendingAmount = totalAmount - currentPaidAmount;

  // Determinar si el botón debe estar deshabilitado
  const isDisabled = requireFullPayment && !isPaidFully;

  // Formatear montos en pesos chilenos
  const formatCLP = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Handler para realizar el check-in
  const handleCheckIn = async () => {
    try {
      setIsLoading(true);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3001/api/v1/reservations/${reservationId}/check-in`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al realizar el check-in');
      }

      const data = await response.json();

      // Cerrar modal y mostrar mensaje de éxito
      setIsDialogOpen(false);
      toast.success('Check-in realizado exitosamente', {
        description: `${guestName} ha ingresado al hotel`,
      });

      // Ejecutar callback de éxito
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (error) {
      console.error('Error al realizar check-in:', error);
      toast.error('Error al realizar check-in', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Contenido del tooltip si está deshabilitado
  const tooltipContent = isDisabled
    ? `Pago incompleto. Pendiente: ${formatCLP(pendingAmount)}`
    : 'Realizar check-in';

  // Botón base
  const ButtonComponent = (
    <Button
      onClick={() => setIsDialogOpen(true)}
      disabled={isDisabled}
      className={`${className} ${
        isDisabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      variant={isDisabled ? 'outline' : 'default'}
    >
      <CheckCircle2 className="w-4 h-4" />
      Realizar Check-in
    </Button>
  );

  return (
    <>
      {/* Botón con tooltip condicional */}
      {isDisabled ? (
        <Tooltip.Provider delayDuration={200}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>{ButtonComponent}</Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                className="z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white shadow-md"
                sideOffset={5}
                side="top"
              >
                {tooltipContent}
                <Tooltip.Arrow className="fill-gray-900" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
      ) : (
        ButtonComponent
      )}

      {/* Modal de confirmación */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Check-in</DialogTitle>
            <DialogDescription>
              ¿Está seguro que desea realizar el check-in de <strong>{guestName}</strong>?
            </DialogDescription>
          </DialogHeader>

          {/* Información de pago */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total:</span>
              <span className="font-semibold">{formatCLP(totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Pagado:</span>
              <span className="font-semibold text-green-600">
                {formatCLP(currentPaidAmount)}
              </span>
            </div>
            {pendingAmount > 0 && (
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                <span className="text-gray-600">Pendiente:</span>
                <span className="font-semibold text-orange-600">
                  {formatCLP(pendingAmount)}
                </span>
              </div>
            )}
          </div>

          {/* Advertencia si hay saldo pendiente pero no es obligatorio pago completo */}
          {pendingAmount > 0 && !requireFullPayment && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                Hay un saldo pendiente de {formatCLP(pendingAmount)}. El huésped podrá
                ingresar, pero deberá pagar antes del check-out.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button onClick={handleCheckIn} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar Check-in
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuickCheckInButton;
