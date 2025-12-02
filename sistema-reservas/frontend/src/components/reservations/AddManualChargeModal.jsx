import React, { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { toast } from 'sonner';

/**
 * AddManualChargeModal Component
 *
 * Modal para agregar cargos manuales a una reserva
 *
 * @param {Object} props
 * @param {number} props.reservationId - ID de la reserva
 * @param {boolean} props.isOpen - Estado del modal
 * @param {Function} props.onClose - Callback para cerrar el modal
 * @param {Function} props.onSuccess - Callback al agregar cargo exitosamente
 * @param {Array} props.rooms - Lista de habitaciones de la reserva (opcional)
 */
const AddManualChargeModal = ({
  reservationId,
  isOpen,
  onClose,
  onSuccess,
  rooms = [],
}) => {
  const [formData, setFormData] = useState({
    chargeType: '',
    description: '',
    amount: '',
    quantity: 1,
    roomId: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Tipos de cargo disponibles
  const chargeTypes = [
    { value: 'minibar', label: 'Minibar' },
    { value: 'room_damage', label: 'Daño a habitación' },
    { value: 'extra_service', label: 'Servicio adicional' },
    { value: 'penalty', label: 'Penalización' },
    { value: 'other', label: 'Otro' },
  ];

  // Resetear formulario al cerrar
  const handleClose = () => {
    setFormData({
      chargeType: '',
      description: '',
      amount: '',
      quantity: 1,
      roomId: '',
    });
    setErrors({});
    onClose();
  };

  // Validar formulario
  const validateForm = () => {
    const newErrors = {};

    if (!formData.chargeType) {
      newErrors.chargeType = 'Tipo de cargo es requerido';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'El monto debe ser mayor a 0';
    }

    if (!formData.quantity || parseInt(formData.quantity) < 1) {
      newErrors.quantity = 'La cantidad debe ser al menos 1';
    }

    if (formData.chargeType === 'other' && !formData.description.trim()) {
      newErrors.description = 'La descripción es obligatoria para tipo "Otro"';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handler para agregar cargo
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3001/api/v1/reservations/${reservationId}/charges`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chargeType: formData.chargeType,
            description: formData.description || undefined,
            amount: parseFloat(formData.amount),
            quantity: parseInt(formData.quantity),
            roomId: formData.roomId ? parseInt(formData.roomId) : undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al agregar cargo');
      }

      const data = await response.json();

      toast.success('Cargo agregado exitosamente', {
        description: `Se agregó ${formData.quantity} x ${formatCLP(formData.amount)}`,
      });

      handleClose();

      if (onSuccess) {
        onSuccess(data.charge);
      }
    } catch (error) {
      toast.error('Error al agregar cargo', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
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

  // Calcular subtotal
  const subtotal = formData.amount && formData.quantity
    ? parseFloat(formData.amount) * parseInt(formData.quantity)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Cargo Manual</DialogTitle>
          <DialogDescription>
            Registra un cargo adicional a la reserva
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de cargo */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Tipo de cargo <span className="text-red-500">*</span>
            </label>
            <Select
              value={formData.chargeType}
              onValueChange={(value) =>
                setFormData({ ...formData, chargeType: value })
              }
            >
              <SelectTrigger className={errors.chargeType ? 'border-red-500' : ''}>
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                {chargeTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.chargeType && (
              <p className="text-xs text-red-600">{errors.chargeType}</p>
            )}
          </div>

          {/* Habitación (opcional) */}
          {rooms.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Habitación (opcional)</label>
              <Select
                value={formData.roomId || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, roomId: value === "none" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ninguna específica" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguna específica</SelectItem>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id.toString()}>
                      Habitación {room.room_number} ({room.room_types?.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Monto */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Monto <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              placeholder="0"
              min="0"
              step="100"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              className={errors.amount ? 'border-red-500' : ''}
            />
            {errors.amount && (
              <p className="text-xs text-red-600">{errors.amount}</p>
            )}
          </div>

          {/* Cantidad */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Cantidad <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              placeholder="1"
              min="1"
              value={formData.quantity}
              onChange={(e) =>
                setFormData({ ...formData, quantity: e.target.value })
              }
              className={errors.quantity ? 'border-red-500' : ''}
            />
            {errors.quantity && (
              <p className="text-xs text-red-600">{errors.quantity}</p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Descripción{' '}
              {formData.chargeType === 'other' && (
                <span className="text-red-500">*</span>
              )}
            </label>
            <Textarea
              placeholder="Descripción del cargo..."
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-xs text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Subtotal */}
          {subtotal > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Subtotal:</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCLP(subtotal)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Agregando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Agregar Cargo
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddManualChargeModal;
