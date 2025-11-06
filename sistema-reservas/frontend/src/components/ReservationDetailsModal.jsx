import React, { useState, useEffect, useContext } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AuthContext } from '../contexts/AuthContext';
import { Button } from './ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/Dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';
import { Loader2, CheckCircle, XCircle, Clock, Check, X, RotateCcw, Trash2, AlertTriangle, ClockAlert } from 'lucide-react';
import StatusBadge from './ui/StatusBadge';
import ReservationTimeline from './ReservationTimeline';
import ReservationFolio from './ReservationFolio';
import ReservationActionsPanel from './ReservationActionsPanel';
import AddManualChargeModal from './AddManualChargeModal';
import RegisterPaymentModal from './RegisterPaymentModal';
import {
  ConfirmPaymentModal,
  RejectPaymentModal,
  AnnulPaymentModal,
  RetryPaymentModal,
  RequestAnnulmentModal,
} from './PaymentActionModals';
import { toast } from 'sonner';

/**
 * ReservationDetailsModal Component
 *
 * Modal mejorado con 8 tabs para gestión completa de reservas
 *
 * @param {Object} props
 * @param {Object} props.reservation - Datos completos de la reserva
 * @param {boolean} props.isOpen - Estado del modal
 * @param {Function} props.onClose - Callback para cerrar el modal
 * @param {Function} props.onUpdate - Callback cuando se actualiza la reserva
 */
const ReservationDetailsModal = ({ reservation, isOpen, onClose, onUpdate }) => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('general');
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [isAddChargeModalOpen, setIsAddChargeModalOpen] = useState(false);
  const [isRegisterPaymentModalOpen, setIsRegisterPaymentModalOpen] = useState(false);

  // Estados para modales de acciones de pagos
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, payment: null });
  const [rejectModal, setRejectModal] = useState({ isOpen: false, payment: null });
  const [annulModal, setAnnulModal] = useState({ isOpen: false, payment: null });
  const [retryModal, setRetryModal] = useState({ isOpen: false, payment: null });
  const [requestAnnulModal, setRequestAnnulModal] = useState({ isOpen: false, payment: null });

  // Cargar pagos cuando se abre el tab de pagos
  useEffect(() => {
    if (activeTab === 'pagos' && reservation?.id) {
      fetchPayments();
    }
  }, [activeTab, reservation?.id]);

  const fetchPayments = async () => {
    try {
      setLoadingPayments(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3001/api/v1/reservations/${reservation.id}/payments`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
      }
    } catch (error) {
      console.error('Error al cargar pagos:', error);
    } finally {
      setLoadingPayments(false);
    }
  };

  // Handler para confirmar pago
  const handleConfirmPayment = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3001/api/v1/reservations/payments/${confirmModal.payment.id}/confirm`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        toast.success('Pago confirmado exitosamente');
        setConfirmModal({ isOpen: false, payment: null });
        fetchPayments();
        if (onUpdate) onUpdate();
      } else {
        const error = await response.json();
        toast.error('Error al confirmar pago', { description: error.message });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al confirmar pago');
    }
  };

  // Handler para rechazar pago
  const handleRejectPayment = async (reason) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3001/api/v1/reservations/payments/${rejectModal.payment.id}/reject`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason }),
        }
      );

      if (response.ok) {
        toast.success('Pago rechazado');
        setRejectModal({ isOpen: false, payment: null });
        fetchPayments();
        if (onUpdate) onUpdate();
      } else {
        const error = await response.json();
        toast.error('Error al rechazar pago', { description: error.message });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al rechazar pago');
    }
  };

  // Handler para anular pago (solo admin)
  const handleAnnulPayment = async (reason) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3001/api/v1/reservations/payments/${annulModal.payment.id}/annul`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason }),
        }
      );

      if (response.ok) {
        toast.success('Pago anulado exitosamente');
        setAnnulModal({ isOpen: false, payment: null });
        fetchPayments();
        if (onUpdate) onUpdate();
      } else {
        const error = await response.json();
        toast.error('Error al anular pago', { description: error.message });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al anular pago');
    }
  };

  // Handler para reintentar pago
  const handleRetryPayment = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3001/api/v1/reservations/payments/${retryModal.payment.id}/retry`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        toast.success('Pago marcado para reintento');
        setRetryModal({ isOpen: false, payment: null });
        fetchPayments();
      } else {
        const error = await response.json();
        toast.error('Error al reintentar pago', { description: error.message });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al reintentar pago');
    }
  };

  // Handler para solicitar anulación (recepcionistas)
  const handleRequestAnnulment = async (reason) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:3001/api/v1/reservations/payments/${requestAnnulModal.payment.id}/request-annulment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason }),
        }
      );

      if (response.ok) {
        toast.success('Solicitud enviada al administrador', {
          description: 'El administrador revisará y procesará su solicitud'
        });

        // Recargar los pagos para mostrar el estado actualizado
        fetchPayments();

        setRequestAnnulModal({ isOpen: false, payment: null });
      } else {
        const error = await response.json();
        toast.error('Error al enviar solicitud', { description: error.message });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al enviar solicitud');
    }
  };

  if (!reservation) return null;

  // 🔍 LOG: Ver estructura completa de reservation
  console.log('🔍 ReservationDetailsModal - reservation completa:', reservation);
  console.log('🔍 main_guest:', reservation.main_guest);
  console.log('🔍 reservation_rooms:', reservation.reservation_rooms);
  console.log('🔍 reservation_guests:', reservation.reservation_guests);
  console.log('🔍 payments:', reservation.payments);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), "dd 'de' MMMM yyyy", { locale: es });
    } catch {
      return 'Fecha inválida';
    }
  };

  const formatCLP = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const channelLabels = {
    chatbot: 'ChatBot/WhatsApp',
    reception: 'Llamada Telefónica',
    in_person: 'Presencial con Cita',
    walk_in: 'Walk-in (sin cita)',
    web: 'Sitio Web',
  };

  const guestName = reservation.main_guest
    ? `${reservation.main_guest.first_name} ${reservation.main_guest.last_name_father || ''}`
    : 'N/A';

  const handleUpdate = (updatedData) => {
    if (onUpdate) {
      onUpdate(updatedData);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>Reserva {reservation.code}</DialogTitle>
            <StatusBadge status={reservation.status} showTooltip />
          </div>
          <DialogDescription>
            Gestión completa de la reserva de {guestName}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="folio">Folio</TabsTrigger>
            <TabsTrigger value="pagos">Pagos</TabsTrigger>
            <TabsTrigger value="huespedes">Huéspedes</TabsTrigger>
            <TabsTrigger value="habitaciones">Habitaciones</TabsTrigger>
            <TabsTrigger value="servicios">Servicios</TabsTrigger>
            <TabsTrigger value="acciones">Acciones</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
          </TabsList>

          {/* TAB 1: GENERAL */}
          <TabsContent value="general" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Código de Reserva</p>
                <p className="text-lg font-bold">{reservation.code}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <StatusBadge status={reservation.status} size="lg" showTooltip />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Huésped Principal</p>
                <p className="font-medium">{guestName}</p>
                {reservation.main_guest?.rut && (
                  <p className="text-sm text-muted-foreground">RUT: {reservation.main_guest.rut}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Canal</p>
                <p className="font-medium">
                  {channelLabels[reservation.channel] || reservation.channel}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tipo de Reserva</p>
                <p className="font-medium">
                  {reservation.booking_type === 'individual' ? 'Individual' : 'Grupal'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cantidad de Huéspedes</p>
                <p className="font-medium">{reservation.guest_count || 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Check-in</p>
                <p className="font-medium">{formatDate(reservation.check_in_date)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Check-out</p>
                <p className="font-medium">{formatDate(reservation.check_out_date)}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Habitaciones</p>
              <div className="flex flex-wrap gap-2">
                {reservation.reservation_rooms?.map((rr, index) => (
                  <div
                    key={index}
                    className="px-3 py-1 bg-primary/20 text-primary-foreground rounded-md text-sm font-medium"
                  >
                    #{rr.rooms?.room_number} - {rr.rooms?.room_type?.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline de estados */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Timeline de Estados
              </h3>
              <ReservationTimeline reservationId={reservation.id} />
            </div>
          </TabsContent>

          {/* TAB 2: FOLIO */}
          <TabsContent value="folio">
            <ReservationFolio
              reservationId={reservation.id}
              editable={['in_progress', 'pending_checkout'].includes(reservation.status)}
              onChargeAdded={() => setIsAddChargeModalOpen(true)}
              onPaymentRegistered={() => setIsRegisterPaymentModalOpen(true)}
            />
          </TabsContent>

          {/* TAB 3: PAGOS */}
          <TabsContent value="pagos" className="space-y-4">
            {/* Resumen de pagos */}
            <div className="bg-muted p-4 rounded-lg">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-xl font-bold">{formatCLP(reservation.total_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pagado</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCLP(reservation.paid_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pendiente</p>
                  <p
                    className={`text-xl font-bold ${
                      reservation.paid_amount >= reservation.total_amount
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {formatCLP(reservation.total_amount - reservation.paid_amount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Tabla de pagos */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Historial de Pagos</h4>

              {loadingPayments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Cargando pagos...</span>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No hay pagos registrados</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">#</th>
                        <th className="text-left p-3 text-sm font-medium">Fecha</th>
                        <th className="text-left p-3 text-sm font-medium">Método</th>
                        <th className="text-left p-3 text-sm font-medium">Tipo</th>
                        <th className="text-right p-3 text-sm font-medium">Monto</th>
                        <th className="text-center p-3 text-sm font-medium">Estado</th>
                        <th className="text-center p-3 text-sm font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment, index) => (
                        <tr key={payment.id} className="border-t hover:bg-muted/50">
                          <td className="p-3 text-sm">{payment.paymentSequence || index + 1}</td>
                          <td className="p-3 text-sm">
                            {format(new Date(payment.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                          </td>
                          <td className="p-3 text-sm">
                            {payment.method === 'cash' && '💵 Efectivo'}
                            {payment.method === 'bank_transfer' && '🏦 Transferencia'}
                            {payment.method === 'credit_card' && '💳 Tarjeta'}
                            {payment.method === 'debit_card' && '💳 Débito'}
                            {payment.method === 'multiple' && '🔄 Múltiples'}
                            {!['cash', 'bank_transfer', 'credit_card', 'debit_card', 'multiple'].includes(payment.method) && payment.method}
                          </td>
                          <td className="p-3 text-sm">
                            {payment.isDeposit ? (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                Depósito
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Pago completo</span>
                            )}
                          </td>
                          <td className="p-3 text-sm text-right font-semibold">
                            {formatCLP(payment.amount)}
                          </td>
                          <td className="p-3 text-center">
                            {payment.status === 'confirmed' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                                <CheckCircle className="w-3 h-3" />
                                Confirmado
                              </span>
                            )}
                            {payment.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                                <Clock className="w-3 h-3" />
                                Pendiente
                              </span>
                            )}
                            {payment.status === 'failed' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                                <XCircle className="w-3 h-3" />
                                Fallido
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1">
                              {/* PENDIENTE: Confirmar + Rechazar */}
                              {payment.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => setConfirmModal({ isOpen: true, payment })}
                                    title="Confirmar pago"
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => setRejectModal({ isOpen: true, payment })}
                                    title="Rechazar pago"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              )}

                              {/* CONFIRMADO: Anular (admin) o Solicitar (recepcionista) */}
                              {payment.status === 'confirmed' && (
                                <>
                                  {user?.role === 'administrator' ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                      onClick={() => setAnnulModal({ isOpen: true, payment })}
                                      title="Anular pago"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  ) : payment.hasPendingAnnulmentRequest ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-blue-600 cursor-not-allowed"
                                      disabled
                                      title={`Solicitud enviada el ${new Date(payment.annulmentRequestInfo?.requestedAt).toLocaleString('es-CL')} - En espera de aprobación del administrador`}
                                    >
                                      <ClockAlert className="w-4 h-4" />
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                                      onClick={() => setRequestAnnulModal({ isOpen: true, payment })}
                                      title="Solicitar anulación"
                                    >
                                      <AlertTriangle className="w-4 h-4" />
                                    </Button>
                                  )}
                                </>
                              )}

                              {/* FALLIDO: Reintentar */}
                              {payment.status === 'failed' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => setRetryModal({ isOpen: true, payment })}
                                  title="Reintentar pago"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted font-semibold">
                      <tr>
                        <td colSpan="4" className="p-3 text-right text-sm">
                          Total Pagado:
                        </td>
                        <td className="p-3 text-right text-sm">
                          {formatCLP(payments.reduce((sum, p) => p.status === 'confirmed' ? sum + p.amount : sum, 0))}
                        </td>
                        <td colSpan="2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 4: HUÉSPEDES */}
          <TabsContent value="huespedes" className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-3">Huésped Principal</h4>
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="font-bold">{guestName}</p>
                <p className="text-sm text-muted-foreground">RUT: {reservation.main_guest?.rut || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">
                  Email: {reservation.main_guest?.email || 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Teléfono: {reservation.main_guest?.phone || 'N/A'}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-3">Huéspedes Adicionales</h4>
              {reservation.reservation_guests?.length > 0 ? (
                <div className="space-y-2">
                  {reservation.reservation_guests.map((rg, index) => (
                    <div key={index} className="p-3 bg-muted border rounded-lg">
                      <p className="font-medium">
                        {rg.guests?.first_name} {rg.guests?.last_name_father}
                      </p>
                      <p className="text-sm text-muted-foreground">RUT: {rg.guests?.rut || 'N/A'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay huéspedes adicionales</p>
              )}
            </div>
          </TabsContent>

          {/* TAB 5: HABITACIONES */}
          <TabsContent value="habitaciones" className="space-y-4">
            {reservation.reservation_rooms?.map((rr, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-lg font-bold">
                      Habitación #{rr.rooms?.room_number}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {rr.rooms?.room_type?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Capacidad: {rr.rooms?.room_type?.base_capacity} personas
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Precio/noche</p>
                    <p className="text-lg font-bold">
                      {formatCLP(rr.unit_price)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* TAB 6: SERVICIOS */}
          <TabsContent value="servicios" className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-3">Servicios Contratados</h4>
              {reservation.reservation_services?.length > 0 ? (
                <div className="space-y-3">
                  {reservation.reservation_services.map((rs, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium">{rs.services?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Cantidad: {rs.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Precio unitario</p>
                          <p className="font-bold">{formatCLP(rs.unit_price)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay servicios contratados</p>
              )}
            </div>
          </TabsContent>

          {/* TAB 7: ACCIONES */}
          <TabsContent value="acciones">
            <ReservationActionsPanel
              reservation={reservation}
              onActionComplete={handleUpdate}
            />
          </TabsContent>

          {/* TAB 8: HISTORIAL */}
          <TabsContent value="historial">
            <div>
              <h4 className="text-sm font-semibold mb-3">Historial de Cambios</h4>
              <ReservationTimeline reservationId={reservation.id} />
            </div>
          </TabsContent>
        </Tabs>

        {/* Modal para agregar cargo manual */}
        <AddManualChargeModal
          reservationId={reservation.id}
          rooms={reservation.reservation_rooms?.map((rr) => ({
            id: rr.rooms?.id,
            room_number: rr.rooms?.room_number,
            room_types: rr.rooms?.room_types,
          })) || []}
          isOpen={isAddChargeModalOpen}
          onClose={() => setIsAddChargeModalOpen(false)}
          onSuccess={handleUpdate}
        />

        {/* Modal para registrar pago */}
        <RegisterPaymentModal
          reservationId={reservation.id}
          pendingAmount={reservation.total_amount - reservation.paid_amount}
          isOpen={isRegisterPaymentModalOpen}
          onClose={() => setIsRegisterPaymentModalOpen(false)}
          onSuccess={handleUpdate}
        />

        {/* Modales de acciones de pagos */}
        <ConfirmPaymentModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ isOpen: false, payment: null })}
          onConfirm={handleConfirmPayment}
          paymentAmount={confirmModal.payment?.amount}
        />

        <RejectPaymentModal
          isOpen={rejectModal.isOpen}
          onClose={() => setRejectModal({ isOpen: false, payment: null })}
          onReject={handleRejectPayment}
          paymentAmount={rejectModal.payment?.amount}
        />

        <AnnulPaymentModal
          isOpen={annulModal.isOpen}
          onClose={() => setAnnulModal({ isOpen: false, payment: null })}
          onAnnul={handleAnnulPayment}
          paymentAmount={annulModal.payment?.amount}
        />

        <RetryPaymentModal
          isOpen={retryModal.isOpen}
          onClose={() => setRetryModal({ isOpen: false, payment: null })}
          onRetry={handleRetryPayment}
          paymentAmount={retryModal.payment?.amount}
        />

        <RequestAnnulmentModal
          isOpen={requestAnnulModal.isOpen}
          onClose={() => setRequestAnnulModal({ isOpen: false, payment: null })}
          onRequest={handleRequestAnnulment}
          paymentAmount={requestAnnulModal.payment?.amount}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ReservationDetailsModal;
