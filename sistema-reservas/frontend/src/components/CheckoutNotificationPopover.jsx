import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchCheckoutAlerts } from '../services/notifications';
import { Button } from '@/components/ui/Button';
import { ClockIcon, HomeIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/solid';

/**
 * Popover que muestra un preview de los checkouts del día
 * Se muestra al hacer clic en la campanita del navbar
 */
function CheckoutNotificationPopover({ isOpen, onClose, onMarkAsRead, onRefetchCount }) {
  const [checkouts, setCheckouts] = useState(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen || !token) return;

    const loadCheckouts = async () => {
      try {
        setLoading(true);
        const data = await fetchCheckoutAlerts(token);
        setCheckouts(data);
      } catch (error) {
        console.error('Error al cargar checkouts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCheckouts();
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleViewDetails = () => {
    onClose();
    navigate('/checkout-alerts');
  };

  const handleMarkAsReadAndClose = () => {
    if (onMarkAsRead) {
      onMarkAsRead();
    }
    
    // Cerrar el popover inmediatamente
    onClose();
    
    // Actualizar el contador de la campanita después de un pequeño delay
    // para asegurar que localStorage ya se actualizó
    if (onRefetchCount) {
      setTimeout(() => {
        onRefetchCount();
      }, 100);
    }
  };

  return (
    <>
      {/* Overlay oscuro */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Popover - Centrado en la pantalla */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-lg shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-orange-500/10">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
              <ClockIcon className="h-5 w-5 text-orange-600" />
            </div>
            <h3 className="font-semibold text-lg text-foreground">
              ¡Atención! Check-outs de Hoy
            </h3>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="h-8 w-8 rounded-full"
          >
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando...
            </div>
          ) : !checkouts || !checkouts.data || checkouts.data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay checkouts programados para hoy
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                Hay <strong className="text-orange-600 font-bold">{checkouts.count}</strong>{' '}
                habitación{checkouts.count > 1 ? 'es' : ''} con check-out programado para hoy.
              </p>

              {/* Hora límite */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg mb-4">
                <ClockIcon className="h-5 w-5 text-orange-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Hora límite de Check-out
                  </p>
                  <p className="text-lg font-bold text-orange-600">11:00 AM</p>
                </div>
              </div>

              {/* Lista de reservas (máximo 3) */}
              <div className="space-y-2 mb-4">
                <p className="text-sm font-semibold text-muted-foreground">
                  Reservas:
                </p>
                {checkouts.data.slice(0, 3).map((checkout) => (
                  <div
                    key={checkout.reservationId}
                    className="flex items-start gap-3 p-3 bg-card border border-border rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <HomeIcon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {checkout.guestInfo.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {checkout.roomCount} habitación{checkout.roomCount > 1 ? 'es' : ''}: {' '}
                        {checkout.rooms.map(r => r.number).join(', ')}
                      </p>
                    </div>
                  </div>
                ))}
                {checkouts.count > 3 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    ... y {checkouts.count - 3} habitación{checkouts.count - 3 > 1 ? 'es' : ''} más
                  </p>
                )}
              </div>

              {/* Recordatorio */}
              <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg p-3 mb-4">
                <p className="text-xs text-orange-800 dark:text-orange-300">
                  💡 <strong>Recordatorio:</strong> Después del check-out, recuerda cambiar el estado de las habitaciones a "Limpieza".
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {checkouts && checkouts.data && checkouts.data.length > 0 && (
          <div className="flex flex-col gap-2 p-4 border-t border-border bg-muted/30">
            <Button 
              onClick={handleViewDetails}
              className="w-full"
            >
              Ver Detalles
            </Button>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="flex-1"
              >
                Ahora no
              </Button>
              <Button 
                variant="secondary" 
                onClick={handleMarkAsReadAndClose}
                className="flex-1"
              >
                ✓ Marcar como Leído
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default CheckoutNotificationPopover;
