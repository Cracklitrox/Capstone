import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchCheckoutAlerts } from '../services/notifications';
import { getWhatsAppBookingAlerts, markWhatsAppAlertsAsViewed } from '../services/whatsapp';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Card, CardContent } from '@/components/ui/Card';
import { Separator } from '@/components/ui/Separator';
import { ClockIcon, HomeIcon, CheckIcon, BellIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { getAlertCategoryConfig } from '../config/alertCategories';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Popover mejorado que muestra alertas categorizadas por tipo
 * Diseño moderno con categorización visual por tipo de alerta
 */
function AlertsPopover({
  isOpen,
  onClose,
  checkoutCount = 0,
  whatsappCount = 0
}) {
  const [checkouts, setCheckouts] = useState(null);
  const [whatsappRequests, setWhatsappRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const { token } = useAuth();
  const navigate = useNavigate();

  // Configuraciones de categorías
  const checkoutConfig = getAlertCategoryConfig('checkout');
  const whatsappConfig = getAlertCategoryConfig('booking_request');

  useEffect(() => {
    if (!isOpen || !token) return;

    const loadData = async () => {
      try {
        setLoading(true);

        const [checkoutsData, whatsappData] = await Promise.all([
          fetchCheckoutAlerts(token),
          getWhatsAppBookingAlerts(token, true)
        ]);

        setCheckouts(checkoutsData);

        const whatsappArray = Array.isArray(whatsappData)
          ? whatsappData
          : (whatsappData?.data || []);

        setWhatsappRequests(whatsappArray);

        // Determinar tab inicial basado en lo que tiene contenido
        if (whatsappArray.length > 0 && (!checkoutsData?.data || checkoutsData.data.length === 0)) {
          setActiveTab('whatsapp');
        } else if (checkoutsData?.data && checkoutsData.data.length > 0) {
          setActiveTab('checkout');
        } else {
          setActiveTab('all');
        }
      } catch (error) {
        console.error('Error al cargar alertas:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleMarkCheckoutAsRead = () => {
    setCheckouts({ data: [], count: 0 });
    setTimeout(() => onClose(), 300);
  };

  const handleMarkWhatsAppAsRead = async () => {
    try {
      await markWhatsAppAlertsAsViewed(token);
      setWhatsappRequests([]);
      window.dispatchEvent(new Event('whatsappAlertsViewed'));
      setTimeout(() => onClose(), 300);
    } catch (error) {
      console.error("Error al marcar alertas como vistas:", error);
      onClose();
    }
  };

  const handleViewCheckouts = () => {
    onClose();
    navigate('/checkout-alerts');
  };

  const handleViewWhatsApp = () => {
    onClose();
    navigate('/notifications/chatbot');
  };

  const totalAlerts = checkoutCount + whatsappCount;
  const hasCheckouts = checkouts?.data && checkouts.data.length > 0;
  const hasWhatsapp = whatsappRequests && whatsappRequests.length > 0;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Popover */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[95vw] sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] bg-card border border-border rounded-lg shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-purple/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-full">
              <BellIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">
                Sistema de Alertas
              </h3>
              <p className="text-xs text-muted-foreground">
                {totalAlerts} {totalAlerts === 1 ? 'alerta pendiente' : 'alertas pendientes'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full flex-shrink-0"
          >
            <XMarkIcon className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              Cargando alertas...
            </div>
          ) : totalAlerts === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BellIcon className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">No hay alertas pendientes</p>
              <p className="text-sm">Todas las alertas han sido atendidas</p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="all" className="text-sm">
                  <BellIcon className="h-4 w-4 mr-2" />
                  Todas
                  {totalAlerts > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5">
                      {totalAlerts}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="checkout" className="text-sm">
                  {checkoutConfig.icon}
                  <span className="ml-2 hidden sm:inline">{checkoutConfig.label}</span>
                  <span className="ml-2 sm:hidden">Checkout</span>
                  {checkoutCount > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5">
                      {checkoutCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="whatsapp" className="text-sm">
                  {whatsappConfig.icon}
                  <span className="ml-2 hidden sm:inline">{whatsappConfig.label}</span>
                  <span className="ml-2 sm:hidden">WA</span>
                  {whatsappCount > 0 && (
                    <Badge className="ml-2 h-5 bg-green-600">
                      {whatsappCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Tab: Todas */}
              <TabsContent value="all" className="mt-0 space-y-3">
                {hasCheckouts && (
                  <AlertCategoryCard
                    config={checkoutConfig}
                    count={checkoutCount}
                    onView={handleViewCheckouts}
                    onMarkAsRead={handleMarkCheckoutAsRead}
                  >
                    <p className="text-sm text-muted-foreground mb-2">
                      {checkouts.count} habitación{checkouts.count > 1 ? 'es' : ''} con check-out programado para hoy
                    </p>
                    <div className="space-y-2">
                      {checkouts.data.slice(0, 2).map((checkout) => (
                        <CheckoutAlertItem key={checkout.reservationId} checkout={checkout} />
                      ))}
                      {checkouts.count > 2 && (
                        <p className="text-xs text-muted-foreground text-center">
                          ... y {checkouts.count - 2} más
                        </p>
                      )}
                    </div>
                  </AlertCategoryCard>
                )}

                {hasWhatsapp && (
                  <AlertCategoryCard
                    config={whatsappConfig}
                    count={whatsappCount}
                    onView={handleViewWhatsApp}
                    onMarkAsRead={handleMarkWhatsAppAsRead}
                  >
                    <p className="text-sm text-muted-foreground mb-2">
                      {whatsappRequests.length} solicitud{whatsappRequests.length > 1 ? 'es' : ''} de reserva por WhatsApp
                    </p>
                    <div className="space-y-2">
                      {whatsappRequests.slice(0, 2).map((request) => (
                        <WhatsAppAlertItem key={request.id} request={request} />
                      ))}
                      {whatsappRequests.length > 2 && (
                        <p className="text-xs text-muted-foreground text-center">
                          ... y {whatsappRequests.length - 2} más
                        </p>
                      )}
                    </div>
                  </AlertCategoryCard>
                )}
              </TabsContent>

              {/* Tab: Checkouts */}
              <TabsContent value="checkout" className="mt-0">
                {!hasCheckouts ? (
                  <EmptyState icon={checkoutConfig.icon} message="No hay checkouts programados para hoy" />
                ) : (
                  <div className="space-y-3">
                    <div className={`flex items-center gap-2 p-3 ${checkoutConfig.bgColor} rounded-lg border ${checkoutConfig.borderColor}`}>
                      <ClockIcon className={`h-5 w-5 ${checkoutConfig.textColor}`} />
                      <div>
                        <p className="text-sm font-semibold">Hora límite de Check-out</p>
                        <p className={`text-lg font-bold ${checkoutConfig.textColor}`}>11:00 AM</p>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {checkouts.count} habitación{checkouts.count > 1 ? 'es' : ''} con check-out programado:
                    </p>

                    <div className="space-y-2">
                      {checkouts.data.map((checkout) => (
                        <CheckoutAlertItem key={checkout.reservationId} checkout={checkout} expanded />
                      ))}
                    </div>

                    <div className={`${checkoutConfig.bgColor} border ${checkoutConfig.borderColor} rounded-lg p-3`}>
                      <p className="text-xs">
                        💡 <strong>Recordatorio:</strong> Después del check-out, recuerda cambiar el estado de las habitaciones a "Limpieza".
                      </p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleViewCheckouts} className="flex-1">
                        Ver Todos los Check-outs
                        <ArrowRightIcon className="h-4 w-4 ml-2" />
                      </Button>
                      <Button onClick={handleMarkCheckoutAsRead} variant="outline">
                        <CheckIcon className="h-4 w-4 mr-2" />
                        Marcar Leído
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Tab: WhatsApp */}
              <TabsContent value="whatsapp" className="mt-0">
                {!hasWhatsapp ? (
                  <EmptyState icon={whatsappConfig.icon} message="No hay solicitudes de WhatsApp pendientes" />
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {whatsappRequests.length} solicitud{whatsappRequests.length > 1 ? 'es' : ''} de reserva:
                    </p>

                    <div className="space-y-3">
                      {whatsappRequests.map((request) => (
                        <WhatsAppAlertItem key={request.id} request={request} expanded />
                      ))}
                    </div>

                    <div className={`${whatsappConfig.bgColor} border ${whatsappConfig.borderColor} rounded-lg p-3`}>
                      <p className="text-xs">
                        💡 <strong>Recordatorio:</strong> Revisa los detalles completos antes de procesar cada solicitud.
                      </p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleViewWhatsApp} className="flex-1 bg-green-600 hover:bg-green-700">
                        Ver Todas las Solicitudes
                        <ArrowRightIcon className="h-4 w-4 ml-2" />
                      </Button>
                      <Button onClick={handleMarkWhatsAppAsRead} variant="outline">
                        <CheckIcon className="h-4 w-4 mr-2" />
                        Marcar Leído
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * Card de categoría de alerta
 */
function AlertCategoryCard({ config, count, onView, onMarkAsRead, children }) {
  return (
    <Card className={`border-l-4 ${config.borderColor}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 ${config.bgColor} rounded-lg`}>
              {config.icon}
            </div>
            <div>
              <h4 className="font-semibold text-sm">{config.label}</h4>
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </div>
          </div>
          <Badge variant={config.badgeVariant}>{count}</Badge>
        </div>

        <Separator className="my-3" />

        {children}

        <div className="flex gap-2 mt-3">
          <Button onClick={onView} variant="outline" size="sm" className="flex-1">
            Ver detalles
          </Button>
          <Button onClick={onMarkAsRead} variant="ghost" size="sm">
            <CheckIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Item de alerta de checkout
 */
function CheckoutAlertItem({ checkout, expanded = false }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-card border border-border rounded-md hover:bg-accent/50 transition-colors">
      <HomeIcon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {checkout.guestInfo.fullName}
        </p>
        <p className="text-xs text-muted-foreground">
          {checkout.roomCount} habitación{checkout.roomCount > 1 ? 'es' : ''}: {' '}
          {checkout.rooms.map(r => r.number).join(', ')}
        </p>
        {expanded && checkout.guestInfo.email && (
          <p className="text-xs text-muted-foreground mt-1">
            📧 {checkout.guestInfo.email}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Item de alerta de WhatsApp
 */
function WhatsAppAlertItem({ request, expanded = false }) {
  const summary = request.fullSummary || {};
  const guest = summary.guest_principal || {};
  const reservation = summary.reservation || {};
  const costs = summary.costs || {};

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
      <div className="flex items-start gap-2 mb-2">
        <div className="p-2 bg-green-600 rounded-full flex-shrink-0">
          <span className="text-white text-xs">📱</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">
            {guest.name || 'Cliente sin nombre'}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {guest.phone || 'Sin teléfono'}
          </p>
        </div>
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs">
          Pendiente
        </Badge>
      </div>

      {expanded && (
        <div className="ml-10 space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium">📅 Fechas:</span>
            <span className="text-muted-foreground">
              {reservation.check_in} → {reservation.check_out}
            </span>
            {reservation.nights && (
              <Badge variant="secondary" className="h-4 text-xs">
                {reservation.nights}n
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium">🏨 Habitación:</span>
            <span className="text-muted-foreground">
              {reservation.room_type_name || 'No especificada'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium">👥 Huéspedes:</span>
            <span className="text-muted-foreground">
              {reservation.adults || 0} adulto{reservation.adults !== 1 ? 's' : ''}
              {reservation.children_under_4 > 0 && ` + ${reservation.children_under_4} niño${reservation.children_under_4 !== 1 ? 's' : ''}`}
            </span>
          </div>

          {costs.total > 0 && (
            <div className="flex items-center gap-2 text-xs pt-1 border-t border-green-200 mt-1">
              <span className="font-medium">💰 Total:</span>
              <span className="font-bold text-green-600">
                ${costs.total?.toLocaleString('es-CL')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Estado vacío
 */
function EmptyState({ icon, message }) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <div className="mb-3 flex justify-center">{icon}</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

export default AlertsPopover;
