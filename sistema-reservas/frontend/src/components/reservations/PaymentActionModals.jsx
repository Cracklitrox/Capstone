import React, { useState } from 'react';
import { Check, X, RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
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

/**
 * Modal para confirmar un pago pendiente
 */
export const ConfirmPaymentModal = ({ isOpen, onClose, onConfirm, paymentAmount }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <Check className="w-5 h-5" />
            Confirmar Pago
          </DialogTitle>
          <DialogDescription>
            ¿Está seguro que desea confirmar este pago?
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-green-800 font-medium">
                Monto: ${paymentAmount?.toLocaleString('es-CL')}
              </p>
              <p className="text-xs text-green-700 mt-1">
                Este pago se marcará como confirmado y se actualizará el saldo de la reserva.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} className="bg-green-600 hover:bg-green-700">
            <Check className="w-4 h-4" />
            Confirmar Pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Modal para rechazar un pago pendiente
 */
export const RejectPaymentModal = ({ isOpen, onClose, onReject, paymentAmount }) => {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    onReject(reason);
    setReason('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <X className="w-5 h-5" />
            Rechazar Pago
          </DialogTitle>
          <DialogDescription>
            Indique la razón del rechazo de este pago
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-800 font-medium">
                Monto: ${paymentAmount?.toLocaleString('es-CL')}
              </p>
              <p className="text-xs text-red-700 mt-1">
                Este pago se marcará como fallido y no afectará el saldo de la reserva.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">Razón del rechazo (opcional)</Label>
          <Textarea
            id="reason"
            placeholder="Ej: Transferencia no verificada, pago rechazado por el banco..."
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="bg-red-600 hover:bg-red-700">
            <X className="w-4 h-4" />
            Rechazar Pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Modal para anular un pago confirmado (solo admin)
 */
export const AnnulPaymentModal = ({ isOpen, onClose, onAnnul, paymentAmount }) => {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!reason.trim()) {
      return;
    }
    onAnnul(reason);
    setReason('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <Trash2 className="w-5 h-5" />
            Anular Pago Confirmado
          </DialogTitle>
          <DialogDescription>
            Esta acción eliminará el pago y recalculará el saldo de la reserva
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-orange-800 font-medium">
                Monto a anular: ${paymentAmount?.toLocaleString('es-CL')}
              </p>
              <p className="text-xs text-orange-700 mt-1">
                <strong>¡Atención!</strong> Esta acción es irreversible y solo está disponible
                para administradores.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">
            Razón de la anulación <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="reason"
            placeholder="Ej: Error en el registro, duplicado, solicitud del cliente..."
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            Debe proporcionar una razón detallada para anular este pago
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason.trim()}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Trash2 className="w-4 h-4" />
            Anular Pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Modal para reintentar un pago fallido
 */
export const RetryPaymentModal = ({ isOpen, onClose, onRetry, paymentAmount }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-600">
            <RotateCcw className="w-5 h-5" />
            Reintentar Pago
          </DialogTitle>
          <DialogDescription>
            ¿Desea marcar este pago como pendiente para reintento?
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <RotateCcw className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 font-medium">
                Monto: ${paymentAmount?.toLocaleString('es-CL')}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                El pago cambiará de estado "Fallido" a "Pendiente" para que pueda confirmarse
                nuevamente.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onRetry} className="bg-blue-600 hover:bg-blue-700">
            <RotateCcw className="w-4 h-4" />
            Reintentar Pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Modal para solicitar anulación (recepcionistas)
 */
export const RequestAnnulmentModal = ({ isOpen, onClose, onRequest, paymentAmount }) => {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (!reason.trim()) {
      return;
    }
    onRequest(reason);
    setReason('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="w-5 h-5" />
            Solicitar Anulación de Pago
          </DialogTitle>
          <DialogDescription>
            Envíe una solicitud al administrador para anular este pago
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-800 font-medium">
                Monto: ${paymentAmount?.toLocaleString('es-CL')}
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Solo los administradores pueden anular pagos confirmados. Se creará una alerta
                para el administrador.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">
            Razón de la solicitud <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="reason"
            placeholder="Explique por qué es necesario anular este pago..."
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason.trim()}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            <AlertTriangle className="w-4 h-4" />
            Enviar Solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
