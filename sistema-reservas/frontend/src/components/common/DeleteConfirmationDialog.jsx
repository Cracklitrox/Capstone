import { AlertTriangle, Trash2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog';
import { Button } from '../ui/Button';

/**
 * Diálogo de confirmación para eliminar alertas con diseño mejorado
 * @param {Object} props
 * @param {boolean} props.open - Si el diálogo está abierto
 * @param {Function} props.onOpenChange - Callback cuando cambia el estado
 * @param {Function} props.onConfirm - Callback cuando se confirma
 * @param {number} props.count - Número de alertas a eliminar (opcional, para eliminación múltiple)
 * @param {string} props.guestName - Nombre del huésped (opcional, para eliminación individual)
 * @param {boolean} props.isDeleting - Estado de carga
 */
export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  count = 1,
  guestName = null,
  isDeleting = false
}) {
  const isMultiple = count > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-500" />
          </div>
          <DialogTitle className="text-center text-xl mt-4">
            {isMultiple ? 'Eliminar Múltiples Alertas' : 'Eliminar Alerta'}
          </DialogTitle>
          <DialogDescription className="text-center text-base mt-2">
            {isMultiple ? (
              <>
                ¿Está seguro que desea eliminar <span className="font-semibold text-foreground">{count} alertas</span>?
              </>
            ) : (
              <>
                ¿Está seguro que desea eliminar la alerta
                {guestName && (
                  <> de <span className="font-semibold text-foreground">{guestName}</span></>
                )}?
              </>
            )}
            <div className="mt-3 text-sm text-muted-foreground">
              Esta acción no se puede deshacer.
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="w-full sm:w-auto order-1 sm:order-2"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar {isMultiple && `(${count})`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
