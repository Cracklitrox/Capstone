import React, { useState } from 'react';
import { Calendar, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/Dialog';
import { Input } from './ui/Input';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * ExtendStayModal Component
 *
 * Modal para extender la estadía de una reserva
 *
 * @param {Object} props
 * @param {Object} props.reservation - Datos de la reserva
 * @param {boolean} props.isOpen - Estado del modal
 * @param {Function} props.onClose - Callback para cerrar el modal
 * @param {Function} props.onSuccess - Callback al extender exitosamente
 */
const ExtendStayModal = ({
  reservation,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [newCheckOutDate, setNewCheckOutDate] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [availabilityData, setAvailabilityData] = useState(null);
  const [error, setError] = useState('');

  // Fecha actual de checkout
  const currentCheckOutDate = reservation?.check_out_date
    ? new Date(reservation.check_out_date)
    : null;

  // Resetear formulario al cerrar
  const handleClose = () => {
    setNewCheckOutDate('');
    setAvailabilityData(null);
    setError('');
    onClose();
  };

  // Formatear fecha para input
  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Validar nueva fecha
  const validateDate = () => {
    if (!newCheckOutDate) {
      setError('Debe seleccionar una nueva fecha de checkout');
      return false;
    }

    const newDate = new Date(newCheckOutDate);
    const currentDate = new Date(currentCheckOutDate);

    if (newDate <= currentDate) {
      setError('La nueva fecha debe ser posterior a la fecha actual de checkout');
      return false;
    }

    setError('');
    return true;
  };

  // Verificar disponibilidad
  const handleCheckAvailability = async () => {
    if (!validateDate()) {
      return;
    }

    try {
      setIsChecking(true);
      setError('');
      setAvailabilityData(null);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3001/api/v1/reservations/${reservation.id}/check-availability-extension`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            newCheckOutDate: new Date(newCheckOutDate).toISOString(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al verificar disponibilidad');
      }

      setAvailabilityData(data);

      if (!data.available) {
        toast.error('Habitaciones no disponibles', {
          description: 'Las habitaciones no están disponibles para las fechas seleccionadas',
        });
      } else {
        toast.success('¡Disponibilidad confirmada!', {
          description: `Se pueden extender ${data.additionalNights} noche(s) adicional(es)`,
        });
      }
    } catch (error) {
      console.error('Error al verificar disponibilidad:', error);
      setError(error.message);
      toast.error('Error al verificar disponibilidad', {
        description: error.message,
      });
    } finally {
      setIsChecking(false);
    }
  };

  // Confirmar extensión
  const handleConfirmExtension = async () => {
    try {
      setIsExtending(true);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3001/api/v1/reservations/${reservation.id}/extend`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            newCheckOutDate: new Date(newCheckOutDate).toISOString(),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al extender estadía');
      }

      const data = await response.json();

      toast.success('Estadía extendida exitosamente', {
        description: `Se agregaron ${availabilityData.additionalNights} noche(s) adicional(es)`,
      });

      handleClose();

      if (onSuccess) {
        onSuccess(data.reservation);
      }
    } catch (error) {
      console.error('Error al extender estadía:', error);
      toast.error('Error al extender estadía', {
        description: error.message,
      });
    } finally {
      setIsExtending(false);
    }
  };

  // Formatear montos
  const formatCLP = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Extender Estadía</DialogTitle>
          <DialogDescription>
            Verifica disponibilidad y extiende la fecha de checkout
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Fecha actual de checkout */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 font-medium">
              Check-out actual:
            </p>
            <p className="text-lg font-bold text-blue-900">
              {currentCheckOutDate && format(currentCheckOutDate, "EEEE, d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>

          {/* Nueva fecha de checkout */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Nueva fecha de checkout <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={newCheckOutDate}
              onChange={(e) => {
                setNewCheckOutDate(e.target.value);
                setAvailabilityData(null);
                setError('');
              }}
              min={currentCheckOutDate ? formatDateForInput(new Date(currentCheckOutDate.getTime() + 86400000)) : ''}
              className={error ? 'border-red-500' : ''}
            />
            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}
          </div>

          {/* Botón verificar disponibilidad */}
          {!availabilityData && (
            <Button
              onClick={handleCheckAvailability}
              disabled={isChecking || !newCheckOutDate}
              className="w-full"
              variant="outline"
            >
              {isChecking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  Verificar Disponibilidad
                </>
              )}
            </Button>
          )}

          {/* Resultado de disponibilidad */}
          {availabilityData && (
            <div className={`p-4 rounded-lg border ${
              availabilityData.available
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {availabilityData.available ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-semibold ${
                    availabilityData.available ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {availabilityData.available
                      ? '¡Habitaciones disponibles!'
                      : 'No disponible'}
                  </p>
                  {availabilityData.available ? (
                    <div className="mt-2 space-y-1 text-sm text-green-800">
                      <p>
                        <strong>Noches adicionales:</strong> {availabilityData.additionalNights}
                      </p>
                      <p>
                        <strong>Habitaciones:</strong> {availabilityData.roomCount}
                      </p>
                      <p>
                        <strong>Precio por noche:</strong> {formatCLP(availabilityData.pricePerNight)}
                      </p>
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <p className="text-base font-bold text-green-900">
                          Costo adicional: {formatCLP(availabilityData.additionalCost)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-red-800">
                      Las habitaciones no están disponibles para las fechas seleccionadas.
                      Por favor, intenta con otra fecha.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isChecking || isExtending}
          >
            Cancelar
          </Button>
          {availabilityData?.available && (
            <Button
              onClick={handleConfirmExtension}
              disabled={isExtending}
              className="bg-green-600 hover:bg-green-700"
            >
              {isExtending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Extendiendo...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Confirmar Extensión
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExtendStayModal;
