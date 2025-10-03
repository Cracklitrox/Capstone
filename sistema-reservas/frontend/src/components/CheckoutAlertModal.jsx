import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { BellAlertIcon, ClockIcon, HomeIcon } from "@heroicons/react/24/outline";

/**
 * Modal de alerta que se muestra al iniciar sesión
 * cuando hay check-outs programados para hoy
 */
function CheckoutAlertModal({ isOpen, onClose, alertsData }) {
  const navigate = useNavigate();

  const handleViewDetails = () => {
    onClose();
    navigate('/checkout-alerts');
  };

  if (!alertsData || alertsData.count === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
              <BellAlertIcon className="h-6 w-6 text-orange-600" />
            </div>
            <DialogTitle className="text-xl">
              ¡Atención! Check-outs de Hoy
            </DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Hay <strong className="text-orange-600 font-bold">{alertsData.count}</strong>{' '}
            habitación{alertsData.count > 1 ? 'es' : ''} con check-out programado para hoy.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          {/* Hora de Check-out */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <ClockIcon className="h-5 w-5 text-orange-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Hora límite de Check-out
              </p>
              <p className="text-lg font-bold text-orange-600">11:00 AM</p>
            </div>
          </div>

          {/* Preview de habitaciones (máximo 3) */}
          {alertsData.data && alertsData.data.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">
                Reservas:
              </p>
              <div className="space-y-2">
                {alertsData.data.slice(0, 3).map((alert) => (
                  <div
                    key={alert.reservationId}
                    className="flex items-center gap-3 p-2 bg-card border border-border rounded-md"
                  >
                    <HomeIcon className="h-4 w-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {alert.guestInfo.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {alert.roomCount} habitación{alert.roomCount > 1 ? 'es' : ''}: {' '}
                        {alert.rooms.map(r => r.number).join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
                {alertsData.count > 3 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    ... y {alertsData.count - 3} habitación{alertsData.count - 3 > 1 ? 'es' : ''} más
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Recordatorio */}
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg p-3">
            <p className="text-sm text-orange-800 dark:text-orange-300">
              💡 <strong>Recordatorio:</strong> Después del check-out, recuerda cambiar el estado de las habitaciones a "Limpieza".
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-initial">
            Cerrar
          </Button>
          <Button onClick={handleViewDetails} className="flex-1 sm:flex-initial">
            Ver Detalles
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CheckoutAlertModal;
