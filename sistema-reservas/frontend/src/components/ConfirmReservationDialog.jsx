import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/Dialog';
import { Button } from './ui/Button';
import { CheckCircle2, AlertTriangle, PartyPopper } from 'lucide-react';

/**
 * Diálogo de confirmación para aceptar una solicitud de reserva
 */
export function ConfirmReservationDialog({ open, onOpenChange, guestName, onConfirm, loading = false }) {
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!open) {
      // Reset success state when dialog closes
      setTimeout(() => setShowSuccess(false), 300);
    }
  }, [open]);

  const handleConfirm = async () => {
    await onConfirm();
    setShowSuccess(true);
    // Close dialog after showing success message
    setTimeout(() => {
      onOpenChange(false);
    }, 2000);
  };

  if (showSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[450px]">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full mb-4 animate-bounce">
              <PartyPopper className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
              ¡Reserva Confirmada!
            </h3>
            <p className="text-muted-foreground">
              Se ha enviado la confirmación al cliente por WhatsApp
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-xl">Confirmar Solicitud de Reserva</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            ¿Está seguro que desea <span className="font-semibold text-green-600 dark:text-green-400">confirmar</span> la solicitud de reserva de{' '}
            <span className="font-semibold text-foreground">{guestName}</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 my-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-medium mb-1">Al confirmar:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                <li>Se enviará un mensaje de confirmación al cliente por WhatsApp</li>
                <li>La solicitud se moverá al tab "Confirmadas"</li>
                <li>El cliente recibirá los detalles completos de su reserva</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Confirmando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Sí, Confirmar Reserva
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
