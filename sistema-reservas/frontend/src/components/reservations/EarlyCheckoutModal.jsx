import React, { useState, useEffect } from 'react';
import { AlertTriangle, Calendar, DollarSign, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog';
import { Label } from '../ui/Label';
import { Textarea } from '../ui/Textarea';
import { toast } from 'sonner';

/**
 * EarlyCheckoutModal Component
 *
 * Modal para procesar salida anticipada con cálculo automático de políticas
 *
 * Política:
 * - Antes de las 09:00 hrs: No se cobra ese día
 * - Después de las 09:00 hrs: Se cobra ese día completo
 * - Días futuros: Siempre se devuelven
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Estado del modal
 * @param {Function} props.onClose - Callback para cerrar
 * @param {Function} props.onConfirm - Callback al confirmar
 * @param {Object} props.reservation - Datos de la reserva
 */
const EarlyCheckoutModal = ({ isOpen, onClose, onConfirm, reservation }) => {
  const [reason, setReason] = useState('');
  const [checkoutDateTime, setCheckoutDateTime] = useState('');
  const [calculation, setCalculation] = useState(null);

  // Inicializar con fecha/hora actual
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setCheckoutDateTime(localDateTime);
    }
  }, [isOpen]);

  // Recalcular cuando cambia la fecha/hora
  useEffect(() => {
    if (checkoutDateTime && reservation) {
      calculateAdjustment();
    }
  }, [checkoutDateTime, reservation]);

  const formatCLP = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculateAdjustment = () => {
    if (!reservation || !checkoutDateTime) return;

    const checkInDate = new Date(reservation.check_in_date);
    const originalCheckOutDate = new Date(reservation.check_out_date);
    const earlyCheckOutDateTime = new Date(checkoutDateTime);

    // Calcular días totales de la reserva
    const totalDays = Math.ceil(
      (originalCheckOutDate - checkInDate) / (1000 * 60 * 60 * 24)
    );

    // Calcular días utilizados
    let daysUsed = Math.ceil(
      (earlyCheckOutDateTime - checkInDate) / (1000 * 60 * 60 * 24)
    );

    // Política: Si es después de las 09:00, se cobra el día completo
    const checkoutHour = earlyCheckOutDateTime.getHours();
    const checkoutMinutes = earlyCheckOutDateTime.getMinutes();
    const checkoutTimeInMinutes = checkoutHour * 60 + checkoutMinutes;
    const cutoffTime = 9 * 60; // 09:00 en minutos

    let chargesCurrentDay = false;
    if (checkoutTimeInMinutes >= cutoffTime) {
      // Después de las 09:00 - se cobra el día
      chargesCurrentDay = true;
    } else {
      // Antes de las 09:00 - NO se cobra el día
      chargesCurrentDay = false;
      daysUsed = Math.max(0, daysUsed - 1);
    }

    // Días no utilizados
    const unusedDays = Math.max(0, totalDays - daysUsed);

    // Cálculos financieros
    const originalTotal = reservation.total_amount || 0;
    const pricePerDay = totalDays > 0 ? originalTotal / totalDays : 0;
    const unusedAmount = unusedDays * pricePerDay;
    const newTotal = originalTotal - unusedAmount;

    setCalculation({
      totalDays,
      daysUsed,
      unusedDays,
      originalTotal,
      pricePerDay,
      unusedAmount,
      newTotal,
      chargesCurrentDay,
      checkoutHour,
      cutoffTime: 9,
    });
  };

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error('Debe proporcionar una razón para la salida anticipada');
      return;
    }

    if (!calculation) {
      toast.error('Error en el cálculo de ajuste');
      return;
    }

    onConfirm({
      reason,
      checkoutDateTime,
      calculation,
    });

    // Reset
    setReason('');
    setCheckoutDateTime('');
    setCalculation(null);
  };

  const handleClose = () => {
    setReason('');
    setCheckoutDateTime('');
    setCalculation(null);
    onClose();
  };

  if (!reservation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
            <AlertTriangle className="w-5 h-5" />
            Salida Anticipada (Early Checkout)
          </DialogTitle>
          <DialogDescription>
            Procesar el check-out antes de la fecha programada con ajuste automático de cargos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
          {/* Información de Estadía */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">Información de Estadía</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-blue-700 dark:text-blue-300">Check-in:</p>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  {new Date(reservation.check_in_date).toLocaleDateString('es-CL')}
                </p>
              </div>
              <div>
                <p className="text-blue-700 dark:text-blue-300">Check-out original:</p>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  {new Date(reservation.check_out_date).toLocaleDateString('es-CL')}
                </p>
              </div>
              {calculation && (
                <>
                  <div>
                    <p className="text-blue-700 dark:text-blue-300">Días totales:</p>
                    <p className="font-medium text-blue-900 dark:text-blue-100">{calculation.totalDays} días</p>
                  </div>
                  <div>
                    <p className="text-blue-700 dark:text-blue-300">Días utilizados:</p>
                    <p className="font-medium text-blue-900 dark:text-blue-100">{calculation.daysUsed} días</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Fecha/Hora de Salida */}
          <div className="space-y-2">
            <Label htmlFor="checkoutDateTime" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Fecha y hora de salida anticipada <span className="text-destructive">*</span>
            </Label>
            <input
              type="datetime-local"
              id="checkoutDateTime"
              value={checkoutDateTime}
              onChange={(e) => setCheckoutDateTime(e.target.value)}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
              required
            />
          </div>

          {/* Política de Cancelación */}
          {calculation && (
            <>
              <div className="p-4 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-3">📋 Política de Cancelación</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <div className={`w-3 h-3 rounded-full mt-0.5 ${!calculation.chargesCurrentDay ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}></div>
                    <div>
                      <p className="font-medium text-purple-900 dark:text-purple-100">Antes de las 09:00 hrs</p>
                      <p className="text-purple-700 dark:text-purple-300">No se cobra el día actual</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className={`w-3 h-3 rounded-full mt-0.5 ${calculation.chargesCurrentDay ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}></div>
                    <div>
                      <p className="font-medium text-purple-900 dark:text-purple-100">Después de las 09:00 hrs</p>
                      <p className="text-purple-700 dark:text-purple-300">Se cobra el día completo</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-800">
                  <p className="font-semibold text-purple-900 dark:text-purple-100">
                    → Política aplicable:{' '}
                    {calculation.chargesCurrentDay ? (
                      <span className="text-red-600 dark:text-red-400">
                        Después de las 09:00 - Se cobra día completo
                      </span>
                    ) : (
                      <span className="text-green-600 dark:text-green-400">
                        Antes de las 09:00 - No se cobra día actual
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Cálculo de Ajuste */}
              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <h4 className="font-semibold text-green-900 dark:text-green-100">Cálculo de Ajuste Financiero</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-700 dark:text-green-300">Total original:</span>
                    <span className="font-medium text-green-900 dark:text-green-100">
                      {formatCLP(calculation.originalTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700 dark:text-green-300">Valor por día:</span>
                    <span className="font-medium text-green-900 dark:text-green-100">
                      {formatCLP(calculation.pricePerDay)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700 dark:text-green-300">Días no utilizados:</span>
                    <span className="font-medium text-green-900 dark:text-green-100">
                      {calculation.unusedDays} días
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-green-300 dark:border-green-800">
                    <span className="text-green-700 dark:text-green-300 font-semibold">Ajuste (devolución):</span>
                    <span className="font-bold text-green-600 dark:text-green-400">
                      -{formatCLP(calculation.unusedAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-green-300 dark:border-green-800">
                    <span className="text-green-700 dark:text-green-300 font-semibold">Nuevo total:</span>
                    <span className="font-bold text-green-900 dark:text-green-100 text-lg">
                      {formatCLP(calculation.newTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Razón */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Razón de la salida anticipada <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Ej: Cliente necesita viajar por emergencia familiar, cambio de planes..."
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Esta razón quedará registrada en el historial de la reserva
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason.trim() || !calculation}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <AlertTriangle className="w-4 h-4" />
            Confirmar Salida Anticipada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EarlyCheckoutModal;
