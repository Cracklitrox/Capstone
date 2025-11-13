import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchCheckoutAlerts, markCheckoutAlertsAsViewed } from '../services/notifications';
import { getWhatsAppBookingAlerts, markWhatsAppAlertsAsViewed } from '../services/whatsapp';
import { ExclamationTriangleIcon, ClockIcon, ChatBubbleLeftIcon, ArrowRightIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './ui/Dropdown-menu';
import { getAlertCategoryConfig } from '../config/alertCategories';

/**
 * Componente de campana de alertas con dropdown compacto
 * Muestra alertas de checkout y WhatsApp de forma resumida
 */
export function AlertsBell({ checkoutCount = 0, whatsappCount = 0 }) {
  const [isOpen, setIsOpen] = useState(false);
  const [checkouts, setCheckouts] = useState(null);
  const [whatsappRequests, setWhatsappRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const navigate = useNavigate();

  const totalCount = checkoutCount + whatsappCount;
  const checkoutConfig = getAlertCategoryConfig('checkout');
  const whatsappConfig = getAlertCategoryConfig('booking_request');

  // Cargar datos cuando se abre el dropdown
  useEffect(() => {
    if (isOpen && token) {
      loadAlerts();
    }
  }, [isOpen, token]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const [checkoutsData, whatsappData] = await Promise.all([
        fetchCheckoutAlerts(token),
        getWhatsAppBookingAlerts(token, true)
      ]);

      setCheckouts(checkoutsData);

      const whatsappArray = Array.isArray(whatsappData)
        ? whatsappData
        : (whatsappData?.data || []);

      setWhatsappRequests(whatsappArray);
    } catch (error) {
      console.error('Error al cargar alertas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCheckouts = () => {
    setIsOpen(false);
    navigate('/notifications/checkouts');
  };

  const handleViewWhatsApp = () => {
    setIsOpen(false);
    navigate('/notifications/chatbot');
  };

  const handleMarkWhatsAppAsRead = async () => {
    try {
      await markWhatsAppAlertsAsViewed(token);
      setWhatsappRequests([]);
      window.dispatchEvent(new Event('whatsappAlertsViewed'));
    } catch (error) {
      console.error("Error al marcar alertas como vistas:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Marcar checkouts como leídos (usando base de datos)
      if (checkouts?.data && checkouts.data.length > 0) {
        await markCheckoutAlertsAsViewed(token);
        setCheckouts({ data: [], count: 0 });
        // Emitir evento para limpiar el contador de checkouts en toda la app
        window.dispatchEvent(new Event('checkoutAlertsCleared'));
      }

      // Marcar WhatsApp como leído
      if (whatsappRequests.length > 0) {
        await markWhatsAppAlertsAsViewed(token);
        setWhatsappRequests([]);
        window.dispatchEvent(new Event('whatsappAlertsViewed'));
      }

      console.log('✅ Todas las alertas marcadas como leídas');

      // Cerrar el dropdown después de marcar como leído
      setTimeout(() => setIsOpen(false), 300);
    } catch (error) {
      console.error("Error al marcar todas las alertas como leídas:", error);
    }
  };

  const getCategoryIcon = (category) => {
    const config = getAlertCategoryConfig(category);
    return (
      <div className={`p-2 ${config.bgColor} rounded-lg`}>
        {config.icon}
      </div>
    );
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <ExclamationTriangleIcon className="h-5 w-5" />
          {totalCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalCount > 99 ? '99+' : totalCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 sm:w-96">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Alertas del Sistema</span>
          {totalCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs h-7"
            >
              <CheckIcon className="h-3 w-3 mr-1" />
              Marcar todo leído
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="max-h-[450px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <ExclamationTriangleIcon className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">No hay alertas pendientes</p>
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {/* Alertas de Checkout */}
              {checkouts?.data && checkouts.data.length > 0 && (
                <div
                  className={`p-3 rounded-lg border-l-4 ${checkoutConfig.borderColor} ${checkoutConfig.bgColor} cursor-pointer hover:opacity-80 transition-opacity`}
                  onClick={handleViewCheckouts}
                >
                  <div className="flex items-start gap-3">
                    <ClockIcon className={`h-5 w-5 ${checkoutConfig.textColor} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-semibold">Check-outs Hoy</h4>
                        <Badge variant={checkoutConfig.badgeVariant} className="ml-2">
                          {checkoutCount}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {checkoutCount} habitación{checkoutCount > 1 ? 'es' : ''} con check-out programado
                      </p>

                      {/* Preview de las primeras 2 habitaciones */}
                      <div className="space-y-1 mb-2">
                        {checkouts.data.slice(0, 2).map((checkout) => (
                          <div key={checkout.reservationId} className="text-xs bg-card/50 rounded px-2 py-1">
                            <span className="font-medium">{checkout.guestInfo.fullName}</span>
                            <span className="text-muted-foreground"> · Hab. {checkout.rooms.map(r => r.number).join(', ')}</span>
                          </div>
                        ))}
                        {checkouts.count > 2 && (
                          <p className="text-xs text-muted-foreground italic">
                            +{checkouts.count - 2} más...
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-primary font-medium">
                        Ver todos
                        <ArrowRightIcon className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Alertas de WhatsApp */}
              {whatsappRequests.length > 0 && (
                <div
                  className={`p-3 rounded-lg border-l-4 ${whatsappConfig.borderColor} ${whatsappConfig.bgColor} cursor-pointer hover:opacity-80 transition-opacity`}
                  onClick={handleViewWhatsApp}
                >
                  <div className="flex items-start gap-3">
                    <ChatBubbleLeftIcon className={`h-5 w-5 ${whatsappConfig.textColor} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-semibold">Solicitudes WhatsApp</h4>
                        <Badge className="ml-2 bg-green-600">
                          {whatsappCount}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {whatsappCount} solicitud{whatsappCount > 1 ? 'es' : ''} pendiente{whatsappCount > 1 ? 's' : ''}
                      </p>

                      {/* Preview de las primeras 2 solicitudes */}
                      <div className="space-y-1 mb-2">
                        {whatsappRequests.slice(0, 2).map((request) => {
                          const guest = request.fullSummary?.guest_principal || {};
                          const reservation = request.fullSummary?.reservation || {};
                          return (
                            <div key={request.id} className="text-xs bg-card/50 rounded px-2 py-1">
                              <span className="font-medium">{guest.name || 'Cliente'}</span>
                              <span className="text-muted-foreground">
                                {' · '}
                                {reservation.check_in && `${reservation.check_in}`}
                                {reservation.room_type_name && ` · ${reservation.room_type_name}`}
                              </span>
                            </div>
                          );
                        })}
                        {whatsappRequests.length > 2 && (
                          <p className="text-xs text-muted-foreground italic">
                            +{whatsappRequests.length - 2} más...
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                        Ver todas
                        <ArrowRightIcon className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
