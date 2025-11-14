import React, { useState } from 'react';
import { LogOut, AlertTriangle, Loader2, Receipt } from 'lucide-react';
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
 * QuickCheckOutButton Component
 *
 * Botón para realizar check-out con validación CRÍTICA de saldo=0
 *
 * ⚠️ TODO: El check-out actualmente cambia las habitaciones a 'cleaning' automáticamente.
 * Esto debería ser MANUAL:
 * - El check-out debería dejar las habitaciones en un estado intermedio
 * - El personal de limpieza debería cambiar manualmente a 'cleaning' cuando inicien
 * - Solo cuando terminen, cambiar a 'available'
 *
 * @param {Object} props
 * @param {number} props.reservationId - ID de la reserva
 * @param {boolean} props.isPaidFully - Si el saldo está en 0 (paid_amount === total_amount)
 * @param {number} props.pendingAmount - Monto pendiente de pago
 * @param {number} props.totalAmount - Monto total de la reserva
 * @param {number} props.paidAmount - Monto pagado
 * @param {string} props.guestName - Nombre del huésped principal
 * @param {Function} props.onSuccess - Callback al completar check-out exitoso
 * @param {string} props.className - Clases CSS adicionales
 */
const QuickCheckOutButton = ({
  reservationId,
  isPaidFully = false,
  pendingAmount = 0,
  totalAmount = 0,
  paidAmount = 0,
  guestName = 'el huésped',
  onSuccess,
  className = '',
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Formatear montos en pesos chilenos
  const formatCLP = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Handler para realizar el check-out
  const handleCheckOut = async () => {
    try {
      setIsLoading(true);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3001/api/v1/reservations/${reservationId}/check-out`,
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
        throw new Error(errorData.message || 'Error al realizar el check-out');
      }

      const data = await response.json();

      // Cerrar modal y mostrar mensaje de éxito
      setIsDialogOpen(false);
      toast.success('Check-out realizado exitosamente', {
        description: `La estadía de ${guestName} ha finalizado`,
      });

      // Ejecutar callback de éxito
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (error) {
      console.error('Error al realizar check-out:', error);
      toast.error('Error al realizar check-out', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Contenido del tooltip si está deshabilitado
  const tooltipContent = !isPaidFully
    ? `No se puede hacer check-out. Pendiente: ${formatCLP(pendingAmount)}`
    : 'Realizar check-out';

  // Botón base
  const ButtonComponent = (
    <Button
      onClick={() => setIsDialogOpen(true)}
      disabled={!isPaidFully}
      className={`${className} ${
        !isPaidFully ? 'opacity-50 cursor-not-allowed bg-gray-300' : 'bg-green-600 hover:bg-green-700'
      }`}
      variant={!isPaidFully ? 'outline' : 'default'}
    >
      <LogOut className="w-4 h-4" />
      Realizar Check-out
    </Button>
  );

  return (
    <>
      {/* Mostrar badge rojo si hay saldo pendiente */}
      <div className="flex flex-col gap-2">
        {!isPaidFully && (
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 border border-red-300 rounded text-xs text-red-800 font-medium">
            <AlertTriangle className="w-3 h-3" />
            Pendiente: {formatCLP(pendingAmount)}
          </div>
        )}

        {/* Botón con tooltip condicional */}
        {!isPaidFully ? (
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
      </div>

      {/* Modal de confirmación con resumen de folio */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Check-out</DialogTitle>
            <DialogDescription>
              ¿Está seguro que desea realizar el check-out de <strong>{guestName}</strong>?
            </DialogDescription>
          </DialogHeader>

          {/* Resumen de folio */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 border-b pb-2">
              <Receipt className="w-4 h-4" />
              Resumen de Folio
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total:</span>
                <span className="font-semibold">{formatCLP(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Pagado:</span>
                <span className="font-semibold text-green-600">
                  {formatCLP(paidAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                <span className="text-gray-600 font-medium">Pendiente:</span>
                <span
                  className={`font-bold ${
                    pendingAmount > 0 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {formatCLP(pendingAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Confirmación visual de saldo en 0 */}
          {isPaidFully && (
            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Receipt className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">
                El saldo está en <strong>$0</strong>. La habitación pasará a estado de
                limpieza automáticamente.
              </p>
            </div>
          )}

          {/* Advertencia crítica si hay saldo pendiente (no debería mostrarse si botón está disabled) */}
          {!isPaidFully && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">
                <strong>¡ATENCIÓN!</strong> No se puede realizar el check-out con saldo
                pendiente. Debe registrarse el pago de {formatCLP(pendingAmount)} antes de
                continuar.
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
            <Button
              onClick={handleCheckOut}
              disabled={isLoading || !isPaidFully}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  Confirmar Check-out
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuickCheckOutButton;
