import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchCheckoutAlerts } from '../services/notifications';
import { getWhatsAppBookingAlerts, markWhatsAppAlertsAsViewed } from '../services/whatsapp';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { Separator } from '@/components/ui/Separator';
import { ClockIcon, HomeIcon, ChatBubbleLeftIcon, CheckIcon, BellIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { getAlertCategoryConfig } from '../config/alertCategories';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Popover que muestra notificaciones categorizadas: Checkouts y Solicitudes de WhatsApp
 * Se muestra al hacer clic en la campanita del navbar
 */
function CheckoutNotificationPopover({ 
  isOpen, 
  onClose, 
  checkoutCount = 0,
  whatsappCount = 0
}) {
  const [checkouts, setCheckouts] = useState(null);
  const [whatsappRequests, setWhatsappRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('checkouts');
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen || !token) return;

    const loadData = async () => {
      try {
        setLoading(true);
        
        // Cargar checkouts y solicitudes de WhatsApp en paralelo
        // Para el popover, solo queremos alertas no vistas
        const [checkoutsData, whatsappData] = await Promise.all([
          fetchCheckoutAlerts(token),
          getWhatsAppBookingAlerts(token, true) // true = solo no vistas
        ]);
        
        setCheckouts(checkoutsData);
        
        // Manejar si whatsappData es un objeto con data o un array directo
        const whatsappArray = Array.isArray(whatsappData) 
          ? whatsappData 
          : (whatsappData?.data || []);
        
        setWhatsappRequests(whatsappArray);
      } catch (error) {
        console.error('Error al cargar notificaciones:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, token]);

  if (!isOpen) return null;

  // 🔄 Función para marcar checkouts como leídos
  const handleMarkCheckoutAsRead = () => {
    console.log("✅ Checkouts marcados como leídos - limpiando lista");
    // Limpiar la lista de checkouts localmente
    setCheckouts({ data: [], count: 0 });
    // Cerrar el popover después de un breve delay
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // 🔄 Función para marcar WhatsApp como leído
  const handleMarkWhatsAppAsRead = async () => {
    console.log("✅ Alertas de WhatsApp marcadas como leídas - guardando en BD");
    
    try {
      // Llamar al backend para marcar como vistas
      await markWhatsAppAlertsAsViewed(token);
      
      // Limpiar la lista de WhatsApp localmente
      setWhatsappRequests([]);
      
      // Emitir evento personalizado para actualizar el contador
      window.dispatchEvent(new Event('whatsappAlertsViewed'));
      
      // Cerrar el popover después de un breve delay
      setTimeout(() => {
        onClose();
      }, 300);
    } catch (error) {
      console.error("❌ Error al marcar alertas como vistas:", error);
      // Aunque haya error, cerrar el popover
      onClose();
    }
  };  const handleViewCheckouts = () => {
    onClose();
    navigate('/checkout-alerts');
  };

  const handleViewWhatsApp = () => {
    onClose();
    navigate('/notifications/chatbot');
  };

  const totalNotifications = checkoutCount + whatsappCount;

  return (
    <>
      {/* Overlay oscuro */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Popover - Responsivo */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[95vw] sm:max-w-[32rem] max-h-[85vh] sm:max-h-[90vh] bg-card border border-border rounded-lg shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border bg-gradient-to-r from-orange-500/10 to-blue-500/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
              <ClockIcon className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-base sm:text-lg text-foreground">
                Alertas
              </h3>
              <p className="text-xs text-muted-foreground">
                {totalNotifications} {totalNotifications === 1 ? 'pendiente' : 'pendientes'}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="h-7 w-7 sm:h-8 sm:w-8 rounded-full flex-shrink-0"
          >
            <XMarkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-1 min-h-0">
          <TabsList className="w-full grid grid-cols-2 p-1 mx-2 my-2 flex-shrink-0">
            <TabsTrigger value="checkouts" className="relative text-xs sm:text-sm py-2">
              <ClockIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Check-outs</span>
              <span className="sm:hidden">Checkout</span>
              {checkoutCount > 0 && (
                <Badge variant="destructive" className="ml-1 sm:ml-2 h-4 sm:h-5 min-w-[1rem] sm:min-w-[1.25rem] px-1 text-[10px] sm:text-xs">
                  {checkoutCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="relative text-xs sm:text-sm py-2">
              <ChatBubbleLeftIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">WhatsApp</span>
              <span className="sm:hidden">WA</span>
              {whatsappCount > 0 && (
                <Badge variant="default" className="ml-1 sm:ml-2 h-4 sm:h-5 min-w-[1rem] sm:min-w-[1.25rem] px-1 bg-green-600 text-[10px] sm:text-xs">
                  {whatsappCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground px-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                Cargando...
              </div>
            ) : (
              <>
                {/* Tab: Checkouts */}
                <TabsContent value="checkouts" className="p-3 sm:p-4 mt-0">
                  {!checkouts || !checkouts.data || checkouts.data.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClockIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay checkouts programados para hoy</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                        Hay <strong className="text-orange-600 font-bold">{checkouts.count}</strong>{' '}
                        habitación{checkouts.count > 1 ? 'es' : ''} con check-out programado para hoy.
                      </p>

                      {/* Hora límite */}
                      <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-muted rounded-lg mb-3 sm:mb-4">
                        <ClockIcon className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 flex-shrink-0" />
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-foreground">
                            Hora límite de Check-out
                          </p>
                          <p className="text-base sm:text-lg font-bold text-orange-600">11:00 AM</p>
                        </div>
                      </div>

                      {/* Lista de reservas (máximo 3) */}
                      <div className="space-y-2 mb-3 sm:mb-4">
                        <p className="text-xs sm:text-sm font-semibold text-muted-foreground">
                          Reservas:
                        </p>
                        {checkouts.data.slice(0, 3).map((checkout) => (
                          <div
                            key={checkout.reservationId}
                            className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-card border border-border rounded-md hover:bg-accent/50 transition-colors"
                          >
                            <HomeIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-foreground truncate">
                                {checkout.guestInfo.fullName}
                              </p>
                              <p className="text-[10px] sm:text-xs text-muted-foreground">
                                {checkout.roomCount} habitación{checkout.roomCount > 1 ? 'es' : ''}: {' '}
                                {checkout.rooms.map(r => r.number).join(', ')}
                              </p>
                            </div>
                          </div>
                        ))}
                        {checkouts.count > 3 && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground text-center pt-1">
                            ... y {checkouts.count - 3} habitación{checkouts.count - 3 > 1 ? 'es' : ''} más
                          </p>
                        )}
                      </div>

                      {/* Recordatorio */}
                      <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg p-2 sm:p-3">
                        <p className="text-[10px] sm:text-xs text-orange-800 dark:text-orange-300">
                          💡 <strong>Recordatorio:</strong> Después del check-out, recuerda cambiar el estado de las habitaciones a "Limpieza".
                        </p>
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* Tab: WhatsApp */}
                <TabsContent value="whatsapp" className="p-3 sm:p-4 mt-0">
                  {!whatsappRequests || !Array.isArray(whatsappRequests) || whatsappRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ChatBubbleLeftIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay solicitudes de WhatsApp pendientes</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                        Tienes <strong className="text-green-600 font-bold">{whatsappRequests.length}</strong>{' '}
                        solicitud{whatsappRequests.length > 1 ? 'es' : ''} de reserva por WhatsApp.
                      </p>

                      {/* Lista de solicitudes (máximo 3) */}
                      <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                        {whatsappRequests.slice(0, 3).map((request) => {
                          const summary = request.fullSummary || {};
                          const guest = summary.guest_principal || {};
                          const reservation = summary.reservation || {};
                          const costs = summary.costs || {};
                          
                          return (
                            <div
                              key={request.id}
                              className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800 rounded-lg p-2 sm:p-3 hover:shadow-md transition-all"
                            >
                              {/* Header con nombre y teléfono */}
                              <div className="flex items-start gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                                <div className="p-1.5 sm:p-2 bg-green-600 rounded-full flex-shrink-0">
                                  <ChatBubbleLeftIcon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                                    {guest.name || 'Cliente sin nombre'}
                                  </p>
                                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                                    📱 {guest.phone || 'Sin teléfono'}
                                  </p>
                                </div>
                                {request.status === 'pending' && (
                                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700 text-[10px] h-5">
                                    Pendiente
                                  </Badge>
                                )}
                              </div>

                              {/* Detalles de la reserva */}
                              <div className="ml-8 sm:ml-11 space-y-0.5 sm:space-y-1">
                                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                                  <span className="font-medium text-foreground">📅 Fechas:</span>
                                  <span className="text-muted-foreground truncate">
                                    {reservation.check_in || '—'} → {reservation.check_out || '—'}
                                  </span>
                                  {reservation.nights && (
                                    <Badge variant="secondary" className="h-4 sm:h-5 text-[10px] px-1">
                                      {reservation.nights}n
                                    </Badge>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                                  <span className="font-medium text-foreground">🏨 Habitación:</span>
                                  <span className="text-muted-foreground truncate">
                                    {reservation.room_type_name || 'No especificada'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                                  <span className="font-medium text-foreground">👥 Huéspedes:</span>
                                  <span className="text-muted-foreground">
                                    {reservation.adults || 0} adulto{reservation.adults !== 1 ? 's' : ''}
                                    {reservation.children_under_4 > 0 && ` + ${reservation.children_under_4} niño${reservation.children_under_4 !== 1 ? 's' : ''}`}
                                  </span>
                                </div>

                                {costs.total > 0 && (
                                  <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs pt-1 border-t border-green-200 dark:border-green-800 mt-1 sm:mt-2">
                                    <span className="font-medium text-foreground">💰 Total:</span>
                                    <span className="font-bold text-green-600 dark:text-green-400">
                                      ${costs.total?.toLocaleString('es-CL')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {whatsappRequests.length > 3 && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground text-center pt-1 sm:pt-2">
                            ... y {whatsappRequests.length - 3} solicitud{whatsappRequests.length - 3 > 1 ? 'es' : ''} más
                          </p>
                        )}
                      </div>

                      {/* Recordatorio */}
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-2 sm:p-3">
                        <p className="text-[10px] sm:text-xs text-green-800 dark:text-green-300">
                          💡 <strong>Recordatorio:</strong> Revisa los detalles completos antes de procesar cada solicitud.
                        </p>
                      </div>
                    </>
                  )}
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>

        {/* Footer */}
        {!loading && (checkouts?.data?.length > 0 || whatsappRequests?.length > 0) && (
          <div className="p-3 sm:p-4 border-t border-border bg-muted/30 flex-shrink-0 space-y-2">
            {activeTab === 'checkouts' && checkouts?.data?.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={handleViewCheckouts}
                  className="flex-1 text-xs sm:text-sm"
                >
                  Ver Todos los Check-outs
                </Button>
                <Button 
                  onClick={handleMarkCheckoutAsRead}
                  variant="outline"
                  className="flex-1 text-xs sm:text-sm"
                >
                  <CheckIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Marcar como Leído
                </Button>
              </div>
            )}
            {activeTab === 'whatsapp' && whatsappRequests?.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={handleViewWhatsApp}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
                >
                  Ver Todas las Solicitudes
                </Button>
                <Button 
                  onClick={handleMarkWhatsAppAsRead}
                  variant="outline"
                  className="flex-1 text-xs sm:text-sm"
                >
                  <CheckIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Marcar como Leído
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default CheckoutNotificationPopover;
