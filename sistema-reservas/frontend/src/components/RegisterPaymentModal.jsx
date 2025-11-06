import React, { useState } from 'react';
import { CreditCard, DollarSign, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/Dialog';
import { Label } from './ui/Label';
import { Input } from './ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/Select';
import { Textarea } from './ui/Textarea';
import { toast } from 'sonner';

/**
 * RegisterPaymentModal Component
 *
 * Modal para registrar un nuevo pago en una reserva
 *
 * @param {Object} props
 * @param {number} props.reservationId - ID de la reserva
 * @param {number} props.pendingAmount - Monto pendiente de pago
 * @param {boolean} props.isOpen - Estado del modal
 * @param {Function} props.onClose - Callback para cerrar el modal
 * @param {Function} props.onSuccess - Callback al registrar el pago exitosamente
 */
const RegisterPaymentModal = ({
  reservationId,
  pendingAmount = 0,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: '',
    is_deposit: false,
    transaction_id: '',
    notes: '',
    confirm_immediately: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resetear form al cerrar
  const handleClose = () => {
    setFormData({
      amount: '',
      payment_method: '',
      is_deposit: false,
      transaction_id: '',
      notes: '',
      confirm_immediately: false,
    });
    onClose();
  };

  // Formatear montos en pesos chilenos
  const formatCLP = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Handler para enviar el formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Error de validación', {
        description: 'El monto debe ser mayor a 0',
      });
      return;
    }

    if (!formData.payment_method) {
      toast.error('Error de validación', {
        description: 'Debe seleccionar un método de pago',
      });
      return;
    }

    if (parseFloat(formData.amount) > pendingAmount) {
      toast.error('Error de validación', {
        description: `El monto no puede exceder el saldo pendiente (${formatCLP(pendingAmount)})`,
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3001/api/v1/reservations/${reservationId}/payments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: parseFloat(formData.amount),
            payment_method: formData.payment_method,
            is_deposit: formData.is_deposit,
            transaction_id: formData.transaction_id || null,
            notes: formData.notes || null,
            confirm_immediately: formData.confirm_immediately,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al registrar el pago');
      }

      const data = await response.json();

      toast.success('Pago registrado exitosamente', {
        description: `Se registró un pago de ${formatCLP(formData.amount)}`,
      });

      handleClose();

      if (onSuccess) {
        onSuccess(data);
      }
    } catch (error) {
      console.error('Error al registrar pago:', error);
      toast.error('Error al registrar pago', {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler para cambiar el monto al máximo pendiente
  const handleSetMaxAmount = () => {
    setFormData({ ...formData, amount: pendingAmount.toString() });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Registrar Pago
          </DialogTitle>
          <DialogDescription>
            Registre un nuevo pago para esta reserva
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Monto pendiente (info) */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                Saldo pendiente: <strong>{formatCLP(pendingAmount)}</strong>
              </span>
            </div>
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              Monto <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="number"
                min="0"
                step="1"
                placeholder="Ej: 50000"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                required
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSetMaxAmount}
              >
                Máximo
              </Button>
            </div>
          </div>

          {/* Método de pago */}
          <div className="space-y-2">
            <Label htmlFor="payment_method">
              Método de Pago <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value) =>
                setFormData({ ...formData, payment_method: value })
              }
            >
              <SelectTrigger id="payment_method">
                <SelectValue placeholder="Seleccione método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">💵 Efectivo</SelectItem>
                <SelectItem value="credit_card">💳 Tarjeta de Crédito</SelectItem>
                <SelectItem value="debit_card">💳 Tarjeta de Débito</SelectItem>
                <SelectItem value="bank_transfer">🏦 Transferencia</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Solo efectivo se confirma automáticamente
            </p>
          </div>

          {/* Es depósito? */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_deposit"
              checked={formData.is_deposit}
              onChange={(e) =>
                setFormData({ ...formData, is_deposit: e.target.checked })
              }
              className="w-4 h-4"
            />
            <Label htmlFor="is_deposit" className="cursor-pointer">
              Marcar como depósito/anticipo
            </Label>
          </div>

          {/* Confirmar inmediatamente (solo para transferencia/tarjetas) */}
          {['bank_transfer', 'credit_card', 'debit_card'].includes(
            formData.payment_method
          ) && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="confirm_immediately"
                  checked={formData.confirm_immediately}
                  onChange={(e) =>
                    setFormData({ ...formData, confirm_immediately: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <Label htmlFor="confirm_immediately" className="cursor-pointer font-medium">
                  Confirmar pago inmediatamente
                </Label>
              </div>
              <p className="text-xs text-yellow-800 ml-6">
                Si no marca esta opción, el pago quedará como "Pendiente" y deberá confirmarlo manualmente después.
              </p>
            </div>
          )}

          {/* Notas (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Observaciones sobre este pago..."
              rows={3}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Registrar Pago
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RegisterPaymentModal;
