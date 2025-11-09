import { useState, useEffect } from 'react';
import { MessageSquare, Phone, Calendar, Users, Bed, DollarSign, Clock, CheckCircle2, XCircle, AlertCircle, User, Mail, Hash, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Separator } from './ui/Separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';
import { Checkbox } from './ui/Checkbox';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { io } from 'socket.io-client';
import { getWhatsAppBookingAlerts, rejectWhatsAppBookingAlert, confirmWhatsAppBookingAlert, deleteWhatsAppBookingAlert, deleteMultipleWhatsAppBookingAlerts } from '../services/whatsapp';
import { ConfirmReservationDialog } from './ConfirmReservationDialog';
import { RejectReservationDialog } from './RejectReservationDialog';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';

/**
 * Panel para mostrar reservas recibidas desde WhatsApp
 */
export function WhatsAppReservationPanel() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [activeTab, setActiveTab] = useState('pending');

  // Estados para los diálogos
  const [confirmDialog, setConfirmDialog] = useState({ open: false, alertId: null, guestName: '' });
  const [rejectDialog, setRejectDialog] = useState({ open: false, alertId: null, guestName: '' });
  const [actionLoading, setActionLoading] = useState(false);

  // Estados para selección múltiple
  const [selectedAlerts, setSelectedAlerts] = useState(new Set());
  const [deletingMultiple, setDeletingMultiple] = useState(false);

  // Función para alternar expansión de cards
  const toggleCardExpansion = (id) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Filtrar reservas por estado
  const pendingReservations = reservations.filter(r => r.status === 'pending');
  const confirmedReservations = reservations.filter(r => r.status === 'resolved');
  const rejectedReservations = reservations.filter(r => r.status === 'ignored');

  useEffect(() => {
    // Obtener token del localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    // Cargar alertas existentes
    const loadExistingAlerts = async () => {
      try {
        const response = await getWhatsAppBookingAlerts(token);
        if (response.success && response.data) {
          const alerts = response.data
            .filter(alert => alert.fullSummary) // Solo alertas con fullSummary
            .map(alert => ({
              id: alert.id,
              status: alert.status,
              summary: alert.fullSummary,
              createdAt: alert.createdAt,
              shortDetail: alert.shortDetail,
            }));
          setReservations(alerts);
        }
      } catch (error) {
        console.error('Error al cargar alertas existentes:', error);
      }
    };

    loadExistingAlerts();

    // Crear conexión Socket.IO
    const socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    socketInstance.on('connect', () => {
      console.log('✅ WhatsApp Panel: Socket conectado');
    });

    // Escuchar nuevas alertas de booking desde WhatsApp
    const handleNewAlert = (alert) => {
      console.log('📱 Nueva alerta recibida:', alert);
      if (alert.type === 'booking_request' && alert.fullSummary) {
        setReservations((prev) => [
          {
            id: alert.id,
            status: alert.status,
            summary: alert.fullSummary,
            createdAt: alert.createdAt,
            shortDetail: alert.shortDetail,
          },
          ...prev,
        ]);
      }
    };

    socketInstance.on('alert:new', handleNewAlert);
    setLoading(false);

    return () => {
      socketInstance.off('alert:new', handleNewAlert);
      socketInstance.disconnect();
    };
  }, []);

  // Abrir diálogo de rechazo
  const openRejectDialog = (alertId, guestName) => {
    setRejectDialog({ open: true, alertId, guestName });
  };

  // Abrir diálogo de confirmación
  const openConfirmDialog = (alertId, guestName) => {
    setConfirmDialog({ open: true, alertId, guestName });
  };

  // Handler para rechazar solicitud con razón
  const handleReject = async (reason) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      await rejectWhatsAppBookingAlert(token, rejectDialog.alertId, reason);

      // Actualizar el estado local para reflejar el rechazo
      setReservations((prev) =>
        prev.map((res) =>
          res.id === rejectDialog.alertId ? { ...res, status: 'ignored' } : res
        )
      );

      setRejectDialog({ open: false, alertId: null, guestName: '' });
      // Solicitud rechazada correctamente. Se ha notificado al cliente.
    } catch (error) {
      console.error('Error al rechazar solicitud:', error);
      alert('Error al rechazar la solicitud. Intente nuevamente.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handler para confirmar solicitud
  const handleConfirm = async () => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      await confirmWhatsAppBookingAlert(token, confirmDialog.alertId);

      // Actualizar el estado local para reflejar la confirmación
      setReservations((prev) =>
        prev.map((res) =>
          res.id === confirmDialog.alertId ? { ...res, status: 'resolved' } : res
        )
      );

      setConfirmDialog({ open: false, alertId: null, guestName: '' });
      // Solicitud confirmada correctamente. Se ha notificado al cliente.
    } catch (error) {
      console.error('Error al confirmar solicitud:', error);
      alert('Error al confirmar la solicitud. Intente nuevamente.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handler para eliminar alerta (soft delete)
  const handleDelete = async (alertId) => {
    if (!confirm('¿Está seguro que desea eliminar esta alerta?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await deleteWhatsAppBookingAlert(token, alertId);

      // Eliminar del estado local
      setReservations((prev) => prev.filter((res) => res.id !== alertId));

      console.log(`✅ Alerta ${alertId} eliminada correctamente`);
    } catch (error) {
      console.error('Error al eliminar alerta:', error);
      alert('Error al eliminar la alerta. Intente nuevamente.');
    }
  };

  // Función para alternar selección de una alerta
  const toggleAlertSelection = (alertId) => {
    setSelectedAlerts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(alertId)) {
        newSet.delete(alertId);
      } else {
        newSet.add(alertId);
      }
      return newSet;
    });
  };

  // Función para seleccionar/deseleccionar todas las alertas del tab actual
  const toggleSelectAll = () => {
    const currentAlerts = activeTab === 'confirmed' ? confirmedReservations : rejectedReservations;
    const currentIds = currentAlerts.map(r => r.id);

    // Si todas están seleccionadas, deseleccionar todas
    const allSelected = currentIds.every(id => selectedAlerts.has(id));

    if (allSelected) {
      setSelectedAlerts(prev => {
        const newSet = new Set(prev);
        currentIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      // Seleccionar todas
      setSelectedAlerts(prev => {
        const newSet = new Set(prev);
        currentIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  };

  // Función para eliminar múltiples alertas seleccionadas
  const handleDeleteSelected = async () => {
    if (selectedAlerts.size === 0) return;

    const count = selectedAlerts.size;
    if (!confirm(`¿Está seguro que desea eliminar ${count} alerta${count !== 1 ? 's' : ''}?`)) {
      return;
    }

    setDeletingMultiple(true);
    try {
      const token = localStorage.getItem('token');
      const alertIds = Array.from(selectedAlerts);

      await deleteMultipleWhatsAppBookingAlerts(token, alertIds);

      // Eliminar del estado local
      setReservations((prev) => prev.filter((res) => !selectedAlerts.has(res.id)));

      // Limpiar selección
      setSelectedAlerts(new Set());

      console.log(`✅ ${count} alerta${count !== 1 ? 's' : ''} eliminada${count !== 1 ? 's' : ''} correctamente`);
    } catch (error) {
      console.error('Error al eliminar alertas:', error);
      alert('Error al eliminar las alertas. Intente nuevamente.');
    } finally {
      setDeletingMultiple(false);
    }
  };

  // Limpiar selección al cambiar de tab
  useEffect(() => {
    setSelectedAlerts(new Set());
  }, [activeTab]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" />Pendiente</Badge>;
      case 'confirmed':
      case 'resolved':
        return <Badge variant="success" className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Confirmada</Badge>;
      case 'rejected':
      case 'ignored':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" />Rechazada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Componente para renderizar una tarjeta compacta
  const ReservationCard = ({ reservation, showCheckbox = false }) => {
    const { summary } = reservation;
    const guest = summary.guest_principal;
    const res = summary.reservation;
    const costs = summary.costs;
    const services = summary.services;
    const payment = summary.payment || {};
    const additionalGuests = summary.additional_guests || [];
    const isExpanded = expandedCards.has(reservation.id);
    const isSelected = selectedAlerts.has(reservation.id);

    return (
      <Card key={reservation.id} className={`border-l-4 border-l-green-500 dark:border-l-green-400 dark:bg-slate-800 ${isSelected ? 'ring-2 ring-primary' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              {showCheckbox && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleAlertSelection(reservation.id)}
                  className="mt-1"
                />
              )}
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base">{guest.name}</CardTitle>
                  {getStatusBadge(reservation.status)}
                </div>
                <CardDescription className="flex items-center gap-3 mt-1 text-xs">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {res.check_in} → {res.check_out}
                  </span>
                  <span className="flex items-center gap-1">
                    <Bed className="h-3 w-3" />
                    {res.room_type_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    ${costs.total.toLocaleString('es-CL')}
                  </span>
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs whitespace-nowrap">
                <Clock className="h-3 w-3 mr-1" />
                {formatDistanceToNow(new Date(reservation.createdAt), { addSuffix: true, locale: es })}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleCardExpansion(reservation.id)}
                className="h-8 w-8 p-0"
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-4 pt-0">
            {/* Información del Huésped Principal */}
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <User className="h-4 w-4" />
                Huésped Principal
              </h3>
              <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-slate-700/50 p-3 rounded-lg text-sm">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">RUT</p>
                  <p className="font-medium">{guest.rut}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Teléfono</p>
                  <p className="font-medium">{guest.phone}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                  <p className="font-medium">{guest.email || 'No proporcionado'}</p>
                </div>
                {guest.birthdate && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Fecha de Nacimiento</p>
                    <p className="font-medium">{guest.birthdate}</p>
                  </div>
                )}
                {guest.gender && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Género</p>
                    <p className="font-medium">{guest.gender}</p>
                  </div>
                )}
                {guest.country && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">País</p>
                    <p className="font-medium">{guest.country}</p>
                  </div>
                )}
                {guest.region && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Región</p>
                    <p className="font-medium">{guest.region}</p>
                  </div>
                )}
                {guest.city && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Ciudad</p>
                    <p className="font-medium">{guest.city}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Detalles de la Reserva */}
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4" />
                Detalles de la Reserva
              </h3>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-center">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Check-in</p>
                  <p className="font-semibold text-sm text-blue-600 dark:text-blue-400">{res.check_in}</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg text-center">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Check-out</p>
                  <p className="font-semibold text-sm text-orange-600 dark:text-orange-400">{res.check_out}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg text-center">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Noches</p>
                  <p className="font-semibold text-sm text-purple-600 dark:text-purple-400">{res.nights}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 dark:bg-slate-700/50 p-2 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Habitación</p>
                  <p className="font-medium text-sm">{res.room_type_name}</p>
                  {res.room_number && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">Nº {res.room_number}</p>
                  )}
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 p-2 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Huéspedes</p>
                  <p className="font-medium text-sm">
                    {res.adults} adulto{res.adults !== 1 ? 's' : ''}
                    {res.children_under_4 > 0 && `, ${res.children_under_4} niño${res.children_under_4 !== 1 ? 's' : ''}`}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total: {res.total_guests}</p>
                </div>
              </div>
              {res.special_requests && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-2 rounded-lg mt-2">
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Solicitudes especiales:</p>
                  <p className="text-sm text-amber-900 dark:text-amber-300">{res.special_requests}</p>
                </div>
              )}
            </div>

            {/* Servicios Adicionales */}
            {(services.laundry || services.breakfast) && (
              <div>
                <h3 className="font-semibold text-sm mb-2">🛎️ Servicios Adicionales</h3>
                <div className="space-y-2">
                  {services.laundry && (
                    <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-700/50 p-2 rounded-lg text-sm">
                      <span>Lavandería</span>
                      <Badge variant="secondary" className="text-xs">{services.laundry_quantity} prenda{services.laundry_quantity !== 1 ? 's' : ''}</Badge>
                    </div>
                  )}
                  {services.breakfast && (
                    <div className="bg-gray-50 dark:bg-slate-700/50 p-2 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Desayuno</span>
                        <Badge variant="secondary" className="text-xs">
                          {services.breakfast_quantity} persona{services.breakfast_quantity !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      {services.breakfast_preferences && services.breakfast_preferences.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {services.breakfast_preferences.map((pref, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {pref}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Método de Pago */}
            {payment && payment.method && (
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4" />
                  Método de Pago
                </h3>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      {payment.method === 'efectivo' ? '💵 Efectivo (Presencial)' : '🏦 Transferencia Bancaria'}
                    </span>
                  </div>
                  
                  {payment.method === 'transferencia' && payment.transfer_amount && (
                    <div className="space-y-1 mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Opción seleccionada:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {payment.transfer_option === 'total' && 'Pago Total'}
                          {payment.transfer_option === '50%' && 'Anticipo 50%'}
                          {payment.transfer_option === 'primera_noche' && 'Primera Noche'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Monto a transferir:</span>
                        <span className="font-bold text-green-700 dark:text-green-400">
                          ${payment.transfer_amount.toLocaleString('es-CL')}
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800 text-xs text-gray-600 dark:text-gray-400">
                        <p className="font-medium mb-1">Datos para transferencia:</p>
                        <p>Hotel Don Teo • RUT: 77.123.456-7</p>
                        <p>Banco de Chile • Cta. Cte.: 1234567890</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Huéspedes Adicionales */}
            {additionalGuests.filter(guest => !guest.is_child).length > 0 && (
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4" />
                  Huéspedes Adicionales ({additionalGuests.filter(guest => !guest.is_child).length})
                </h3>
                <div className="space-y-2">
                  {additionalGuests.filter(guest => !guest.is_child).map((guest, idx) => (
                    <div key={idx} className="bg-gray-50 dark:bg-slate-700/50 p-2 rounded-lg text-sm">
                      <p className="font-medium">{guest.name || 'No proporcionado'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">RUT: {guest.rut || 'N/A'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Email: {guest.email || 'N/A'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Tel: {guest.phone || 'N/A'}</p>
                      {guest.birthdate && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">Nacimiento: {guest.birthdate}</p>
                      )}
                      {guest.gender && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">Género: {guest.gender}</p>
                      )}
                      {(guest.city || guest.region || guest.country) && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Ubicación: {[guest.city, guest.region, guest.country].filter(Boolean).join(', ') || 'N/A'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resumen de Costos */}
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4" />
                Resumen de Costos
              </h3>
              <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-3 rounded-lg space-y-1 border border-green-200 dark:border-green-800">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Habitación ({costs.room_nights} noche{costs.room_nights !== 1 ? 's' : ''})</span>
                  <span className="font-medium">${costs.room_total.toLocaleString('es-CL')}</span>
                </div>
                {costs.breakfast_total > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Desayuno</span>
                    <span className="font-medium">${costs.breakfast_total.toLocaleString('es-CL')}</span>
                  </div>
                )}
                <Separator className="my-1" />
                <div className="flex justify-between text-base font-bold">
                  <span>TOTAL</span>
                  <span className="text-green-600 dark:text-green-400">${costs.total.toLocaleString('es-CL')}</span>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-2 pt-2">
              {reservation.status === 'pending' ? (
                <>
                  <Button
                    className="flex-1"
                    variant="default"
                    size="sm"
                    onClick={() => openConfirmDialog(reservation.id, guest.name)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Confirmar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => openRejectDialog(reservation.id, guest.name)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Rechazar
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  onClick={() => handleDelete(reservation.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  if (reservations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">No hay solicitudes de WhatsApp</p>
        <p className="text-sm">Las nuevas reservas recibidas por WhatsApp aparecerán aquí</p>
      </div>
    );
  }

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
        <TabsTrigger value="pending" className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Pendientes
          {pendingReservations.length > 0 && (
            <Badge variant="warning" className="ml-1">
              {pendingReservations.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="confirmed" className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Confirmadas
          {confirmedReservations.length > 0 && (
            <Badge variant="success" className="ml-1">
              {confirmedReservations.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="rejected" className="flex items-center gap-2">
          <XCircle className="h-4 w-4" />
          Rechazadas
          {rejectedReservations.length > 0 && (
            <Badge variant="destructive" className="ml-1">
              {rejectedReservations.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pending" className="mt-0">
        {pendingReservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">No hay solicitudes pendientes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingReservations.map((reservation) => (
              <ReservationCard key={reservation.id} reservation={reservation} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="confirmed" className="mt-0">
        {confirmedReservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">No hay solicitudes confirmadas</p>
          </div>
        ) : (
          <>
            {/* Barra de acciones para selección múltiple */}
            <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={confirmedReservations.length > 0 && confirmedReservations.every(r => selectedAlerts.has(r.id))}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm font-medium">
                  {selectedAlerts.size > 0
                    ? `${selectedAlerts.size} seleccionada${selectedAlerts.size !== 1 ? 's' : ''}`
                    : 'Seleccionar todas'}
                </span>
              </div>
              {selectedAlerts.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={deletingMultiple}
                >
                  {deletingMultiple ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Eliminar seleccionadas
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {confirmedReservations.map((reservation) => (
                <ReservationCard key={reservation.id} reservation={reservation} showCheckbox={true} />
              ))}
            </div>
          </>
        )}
      </TabsContent>

      <TabsContent value="rejected" className="mt-0">
        {rejectedReservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <XCircle className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">No hay solicitudes rechazadas</p>
          </div>
        ) : (
          <>
            {/* Barra de acciones para selección múltiple */}
            <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={rejectedReservations.length > 0 && rejectedReservations.every(r => selectedAlerts.has(r.id))}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm font-medium">
                  {selectedAlerts.size > 0
                    ? `${selectedAlerts.size} seleccionada${selectedAlerts.size !== 1 ? 's' : ''}`
                    : 'Seleccionar todas'}
                </span>
              </div>
              {selectedAlerts.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={deletingMultiple}
                >
                  {deletingMultiple ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Eliminar seleccionadas
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {rejectedReservations.map((reservation) => (
                <ReservationCard key={reservation.id} reservation={reservation} showCheckbox={true} />
              ))}
            </div>
          </>
        )}
      </TabsContent>
    </Tabs>
    
    {/* Diálogo de confirmación */}
    <ConfirmReservationDialog
      open={confirmDialog.open}
      onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      guestName={confirmDialog.guestName}
      onConfirm={handleConfirm}
      loading={actionLoading}
    />

    {/* Diálogo de rechazo */}
    <RejectReservationDialog
      open={rejectDialog.open}
      onOpenChange={(open) => setRejectDialog({ ...rejectDialog, open })}
      guestName={rejectDialog.guestName}
      onReject={handleReject}
      loading={actionLoading}
    />
    </>
  );
}
