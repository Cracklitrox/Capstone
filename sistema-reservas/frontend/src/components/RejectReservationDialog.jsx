import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/Dialog';
import { Button } from './ui/Button';
import { Textarea } from './ui/Textarea';
import { XCircle, AlertTriangle } from 'lucide-react';

/**
 * Diálogo de rechazo para rechazar una solicitud de reserva con motivo
 */
export function RejectReservationDialog({ open, onOpenChange, guestName, onReject, loading = false }) {
  const [reason, setReason] = useState('');

  const handleReject = () => {
    onReject(reason);
    setReason(''); // Limpiar el campo después de rechazar
  };

  const handleCancel = () => {
    setReason(''); // Limpiar el campo al cancelar
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-xl">Rechazar Solicitud de Reserva</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            ¿Está seguro que desea <span className="font-semibold text-red-600 dark:text-red-400">rechazar</span> la solicitud de reserva de{' '}
            <span className="font-semibold text-foreground">{guestName}</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          <div>
            <label htmlFor="reason" className="text-sm font-medium text-foreground mb-2 block">
              Motivo del rechazo <span className="text-muted-foreground">(Opcional)</span>
            </label>
            <Textarea
              id="reason"
              placeholder="Ej: No hay disponibilidad para las fechas solicitadas, habitación no disponible, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={250}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {reason.length}/250 caracteres
              {reason.length > 0 && ' - Este motivo se enviará al cliente por WhatsApp'}
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900 dark:text-amber-100">
                <p className="font-medium mb-1">Al rechazar:</p>
                <ul className="list-disc list-inside space-y-1 text-amber-800 dark:text-amber-200">
                  <li>Se enviará un mensaje de rechazo al cliente por WhatsApp</li>
                  <li>La solicitud se moverá al tab "Rechazadas"</li>
                  {reason && <li>El cliente verá el motivo del rechazo</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleReject}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Rechazando...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Sí, Rechazar Solicitud
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
