import React, { useState, useEffect } from 'react';
import { ArrowUp, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
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
import { Textarea } from '../ui/Textarea';
import { toast } from 'sonner';

/**
 * RoomUpgradeModal Component
 *
 * Modal para realizar upgrade de habitación a categoría superior
 *
 * @param {Object} props
 * @param {Object} props.reservation - Datos de la reserva
 * @param {boolean} props.isOpen - Estado del modal
 * @param {Function} props.onClose - Callback para cerrar el modal
 * @param {Function} props.onSuccess - Callback al realizar upgrade exitosamente
 */
const RoomUpgradeModal = ({
  reservation,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isLoadingUpgrades, setIsLoadingUpgrades] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [availableUpgrades, setAvailableUpgrades] = useState([]);
  const [selectedUpgrade, setSelectedUpgrade] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  // Cargar upgrades disponibles al abrir modal
  useEffect(() => {
    if (isOpen && reservation?.id) {
      loadAvailableUpgrades();
    }
  }, [isOpen, reservation?.id]);

  // Resetear formulario al cerrar
  const handleClose = () => {
    setSelectedUpgrade('');
    setReason('');
    setError('');
    setAvailableUpgrades([]);
    onClose();
  };

  // Cargar habitaciones disponibles para upgrade
  const loadAvailableUpgrades = async () => {
    try {
      setIsLoadingUpgrades(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3001/api/v1/rooms/available-upgrades?reservationId=${reservation.id}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al cargar upgrades disponibles');
      }

      const data = await response.json();
      setAvailableUpgrades(data.upgrades || []);

      if (!data.upgrades || data.upgrades.length === 0) {
        setError('No hay habitaciones superiores disponibles para upgrade');
      }
    } catch (error) {
      setError(error.message);
      toast.error('Error al cargar habitaciones', {
        description: error.message,
      });
    } finally {
      setIsLoadingUpgrades(false);
    }
  };

  // Validar selección
  const validateForm = () => {
    if (!selectedUpgrade) {
      setError('Debes seleccionar una habitación para el upgrade');
      return false;
    }
    setError('');
    return true;
  };

  // Realizar upgrade
  const handleUpgrade = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsUpgrading(true);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3001/api/v1/reservations/${reservation.id}/upgrade-room`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            newRoomId: parseInt(selectedUpgrade),
            reason: reason || 'Upgrade solicitado por el huésped',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al realizar upgrade');
      }

      const data = await response.json();

      const upgradeInfo = availableUpgrades.find(
        (u) => u.id === parseInt(selectedUpgrade)
      );

      toast.success('Upgrade realizado exitosamente', {
        description: `Habitación cambiada a ${upgradeInfo?.room_type?.name} #${upgradeInfo?.room_number}`,
      });

      handleClose();

      if (onSuccess) {
        onSuccess(data.reservation);
      }
    } catch (error) {
      toast.error('Error al realizar upgrade', {
        description: error.message,
      });
    } finally {
      setIsUpgrading(false);
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

  // Obtener información del upgrade seleccionado
  const selectedUpgradeInfo = availableUpgrades.find(
    (u) => u.id === parseInt(selectedUpgrade)
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Upgrade de Habitación</DialogTitle>
          <DialogDescription>
            Selecciona una habitación de categoría superior
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
          {/* Habitación actual */}
          {reservation?.reservation_rooms && reservation.reservation_rooms.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-2">
                Habitación actual:
              </p>
              {reservation.reservation_rooms.map((rr, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {rr.rooms?.room_type?.name || 'N/A'} #{rr.rooms?.room_number || 'N/A'}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    ({formatCLP(rr.rooms?.base_price || 0)}/noche)
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Estado de carga */}
          {isLoadingUpgrades && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Cargando habitaciones disponibles...</span>
            </div>
          )}

          {/* Error al cargar */}
          {!isLoadingUpgrades && error && !availableUpgrades.length && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-100">No hay upgrades disponibles</p>
                  <p className="text-sm text-red-800 dark:text-red-200 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Selector de habitación */}
          {!isLoadingUpgrades && availableUpgrades.length > 0 && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Habitación de upgrade <span className="text-red-500">*</span>
                </label>
                <Select
                  value={selectedUpgrade}
                  onValueChange={(value) => {
                    setSelectedUpgrade(value);
                    setError('');
                  }}
                >
                  <SelectTrigger className={error && !selectedUpgrade ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Seleccionar habitación..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUpgrades.map((upgrade) => (
                      <SelectItem key={upgrade.id} value={upgrade.id.toString()}>
                        {upgrade.room_type?.name} #{upgrade.room_number} - {formatCLP(upgrade.room_type?.price_per_night)}/noche
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {error && !selectedUpgrade && (
                  <p className="text-xs text-red-600">{error}</p>
                )}
              </div>

              {/* Detalles del upgrade seleccionado */}
              {selectedUpgradeInfo && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-900 dark:text-green-100">
                        {selectedUpgradeInfo.room_type?.name} #{selectedUpgradeInfo.room_number}
                      </p>
                      <div className="mt-2 space-y-1 text-sm text-green-800 dark:text-green-200">
                        <p>
                          <strong>Capacidad:</strong> {selectedUpgradeInfo.room_type?.capacity || 0} personas
                        </p>
                        <p>
                          <strong>Precio por noche:</strong> {formatCLP(selectedUpgradeInfo.room_type?.price_per_night || 0)}
                        </p>
                        <p>
                          <strong>Diferencia de precio:</strong>{' '}
                          <span className="text-green-700 dark:text-green-300 font-semibold">
                            +{formatCLP(selectedUpgradeInfo.priceDifference || 0)}/noche
                          </span>
                        </p>
                        <p>
                          <strong>Noches restantes:</strong> {selectedUpgradeInfo.remainingNights || 0}
                        </p>
                        <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                          <p className="text-base font-bold text-green-900 dark:text-green-100">
                            Costo adicional total: {formatCLP(selectedUpgradeInfo.totalAdditionalCost || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Razón del upgrade */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Razón del upgrade (opcional)
                </label>
                <Textarea
                  placeholder="Ej: Solicitud del huésped por mejor vista, aniversario..."
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isUpgrading}
          >
            Cancelar
          </Button>
          {!isLoadingUpgrades && availableUpgrades.length > 0 && (
            <Button
              onClick={handleUpgrade}
              disabled={isUpgrading || !selectedUpgrade}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isUpgrading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Realizando Upgrade...
                </>
              ) : (
                <>
                  <ArrowUp className="w-4 h-4" />
                  Confirmar Upgrade
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RoomUpgradeModal;
