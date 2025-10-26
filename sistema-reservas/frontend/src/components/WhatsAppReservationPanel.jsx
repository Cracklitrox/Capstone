import { useState, useEffect } from 'react';
import { MessageSquare, Phone, Calendar, Users, Bed, DollarSign, Clock, CheckCircle2, XCircle, AlertCircle, User, Mail, Hash } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Separator } from './ui/Separator';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { io } from 'socket.io-client';
import { getWhatsAppBookingAlerts } from '../services/whatsapp';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';

/**
 * Panel para mostrar reservas recibidas desde WhatsApp
 */
export function WhatsAppReservationPanel() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" />Pendiente</Badge>;
      case 'confirmed':
        return <Badge variant="success" className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Confirmada</Badge>;
      case 'rejected':
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
    <div className="space-y-4">
      {reservations.map((reservation) => {
        const { summary } = reservation;
        const guest = summary.guest_principal;
        const res = summary.reservation;
        const costs = summary.costs;
        const services = summary.services;
        const additionalGuests = summary.additional_guests || [];

        return (
          <Card key={reservation.id} className="border-l-4 border-l-green-500">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <MessageSquare className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      Solicitud de Reserva - WhatsApp
                      {getStatusBadge(reservation.status)}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(reservation.createdAt), { addSuffix: true, locale: es })}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Información del Huésped Principal */}
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <User className="h-4 w-4" />
                  Huésped Principal
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 mt-0.5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Nombre</p>
                      <p className="font-medium">{guest.name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Hash className="h-4 w-4 mt-0.5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">RUT</p>
                      <p className="font-medium">{guest.rut}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 mt-0.5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-medium">{guest.email || 'No proporcionado'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 mt-0.5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Teléfono WhatsApp</p>
                      <p className="font-medium">{guest.phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Detalles de la Reserva */}
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4" />
                  Detalles de la Reserva
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-lg">
                    <Calendar className="h-4 w-4 mt-0.5 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-600">Check-in</p>
                      <p className="font-semibold text-blue-600">{res.check_in}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-orange-50 p-3 rounded-lg">
                    <Calendar className="h-4 w-4 mt-0.5 text-orange-600" />
                    <div>
                      <p className="text-xs text-gray-600">Check-out</p>
                      <p className="font-semibold text-orange-600">{res.check_out}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-purple-50 p-3 rounded-lg">
                    <Clock className="h-4 w-4 mt-0.5 text-purple-600" />
                    <div>
                      <p className="text-xs text-gray-600">Noches</p>
                      <p className="font-semibold text-purple-600">{res.nights}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg">
                    <Bed className="h-4 w-4 mt-0.5 text-gray-600" />
                    <div>
                      <p className="text-xs text-gray-500">Habitación</p>
                      <p className="font-medium">{res.room_type_name}</p>
                      {res.room_number && (
                        <p className="text-xs text-gray-500">Nº {res.room_number}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg">
                    <Users className="h-4 w-4 mt-0.5 text-gray-600" />
                    <div>
                      <p className="text-xs text-gray-500">Huéspedes</p>
                      <p className="font-medium">
                        {res.adults} adulto{res.adults !== 1 ? 's' : ''}
                        {res.children_under_4 > 0 && `, ${res.children_under_4} niño${res.children_under_4 !== 1 ? 's' : ''} ${'<'}4 años`}
                      </p>
                      <p className="text-xs text-gray-500">Total: {res.total_guests} personas</p>
                    </div>
                  </div>
                </div>

                {res.special_requests && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mt-3">
                    <p className="text-xs text-amber-700 font-medium mb-1">Solicitudes especiales:</p>
                    <p className="text-sm text-amber-900">{res.special_requests}</p>
                  </div>
                )}
              </div>

              {/* Servicios Adicionales */}
              {(services.laundry || services.breakfast) && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-sm mb-3">🛎️ Servicios Adicionales</h3>
                    <div className="space-y-2">
                      {services.laundry && (
                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <span className="text-sm">Lavandería</span>
                          <Badge variant="secondary">{services.laundry_quantity} prenda{services.laundry_quantity !== 1 ? 's' : ''}</Badge>
                        </div>
                      )}
                      {services.breakfast && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Desayuno</span>
                            <Badge variant="secondary">
                              {services.breakfast_quantity} persona{services.breakfast_quantity !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          {services.breakfast_preferences && services.breakfast_preferences.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-1">Preferencias:</p>
                              <div className="flex flex-wrap gap-1">
                                {services.breakfast_preferences.map((pref, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {pref}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Huéspedes Adicionales */}
              {additionalGuests.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4" />
                      Huéspedes Adicionales ({additionalGuests.length})
                    </h3>
                    <div className="space-y-2">
                      {additionalGuests.map((guest, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm flex items-center gap-2">
                                {guest.name}
                                {guest.is_child && <Badge variant="secondary" className="text-xs">Niño {'<'}4 años</Badge>}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">RUT: {guest.rut}</p>
                              {!guest.is_child && (
                                <>
                                  <p className="text-xs text-gray-500">Email: {guest.email}</p>
                                  <p className="text-xs text-gray-500">Teléfono: {guest.phone}</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Resumen de Costos */}
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
                  <DollarSign className="h-4 w-4" />
                  Resumen de Costos
                </h3>
                <div className="bg-gradient-to-br from-green-50 to-blue-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Habitación ({costs.room_nights} noche{costs.room_nights !== 1 ? 's' : ''})</span>
                    <span className="font-medium">${costs.room_total.toLocaleString('es-CL')}</span>
                  </div>
                  {costs.breakfast_total > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Desayuno</span>
                      <span className="font-medium">${costs.breakfast_total.toLocaleString('es-CL')}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>TOTAL</span>
                    <span className="text-green-600">${costs.total.toLocaleString('es-CL')}</span>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-2 pt-4">
                <Button className="flex-1" variant="default">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Crear Reserva
                </Button>
                <Button className="flex-1" variant="outline">
                  <Phone className="h-4 w-4 mr-2" />
                  Contactar Cliente
                </Button>
                <Button variant="destructive">
                  <XCircle className="h-4 w-4 mr-2" />
                  Rechazar
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
