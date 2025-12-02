import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/Button';
import { Card, CardContent } from '../../ui/Card';
import { Label } from '../../ui/Label';
import { Input } from '../../ui/Input';
import { Separator } from '../../ui/Separator';
import { Badge } from '../../ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/Tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/Select';
import { Checkbox } from '../../ui/Checkbox';
import { Calendar, Users, Home, DollarSign, AlertCircle, Receipt, CreditCard, Banknote, UserPlus, X, Plus, Check } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { reservationsService } from '../../../services/reservations';
import { GuestDetailsModal } from '../../guests/GuestDetailsModal';
import {
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';

const PAYMENT_PRESETS = {
  FULL: 'full',
  HALF: 'half',
  FIRST_NIGHT: 'first_night',
  CUSTOM: 'custom',
};

const Step6Summary = ({ data, onUpdate, onBack, onCreate }) => {
  const [paymentMethod, setPaymentMethod] = useState(data.paymentMethod || '');
  const [paymentAmount, setPaymentAmount] = useState(data.paymentAmount || 0);
  const [paymentPreset, setPaymentPreset] = useState(PAYMENT_PRESETS.FULL);
  const [paymentType, setPaymentType] = useState(data.paymentType || 'full');
  const [pricing, setPricing] = useState(data.pricing || null);
  const [loading, setLoading] = useState(!data.pricing);
  const [creating, setCreating] = useState(false);
  const [channel, setChannel] = useState(data.channel || '');

  // Pagos múltiples
  const [multiplePayments, setMultiplePayments] = useState([]);
  const [showMultiplePayments, setShowMultiplePayments] = useState(false);

  // ✅ SIMPLIFICADO: Cargar asignaciones YA HECHAS en steps anteriores
  const [roomGuestAssignments, setRoomGuestAssignments] = useState(
    data.roomGuestAssignments || []
  );

  // ✅ SIMPLIFICADO: Cargar servicios YA ASIGNADOS en Step 4
  const [roomServiceAssignments, setRoomServiceAssignments] = useState(
    data.roomServiceAssignments || []
  );
  const [tempRoomServiceAssignments, setTempRoomServiceAssignments] = useState([]); // ✅ Estado temporal para edición
  const [isEditingServices, setIsEditingServices] = useState(false); // ✅ Modo edición activo
  const [showServiceAssignments, setShowServiceAssignments] = useState(false); // Nuevo: controla expansión del panel

  // ✅ Sincronizar estado local con datos que llegan de steps anteriores
  useEffect(() => {
    if (data.roomGuestAssignments && data.roomGuestAssignments.length > 0) {
      setRoomGuestAssignments(data.roomGuestAssignments);
    }
    if (data.roomServiceAssignments && data.roomServiceAssignments.length > 0) {
      setRoomServiceAssignments(data.roomServiceAssignments);
    }
  }, [data.roomGuestAssignments, data.roomServiceAssignments]);

  // ✅ REMOVIDO: useEffect que podría causar renders innecesarios
  // useEffect(() => {
  //   if (creating && data.paymentMethod && data.paymentAmount > 0) {
  //     onCreate();
  //   }
  // }, [data.paymentMethod, data.paymentAmount, creating, onCreate]);

  // ✅ SIMPLIFICADO: Siempre calcular pricing desde el backend (tiene precios correctos)
  useEffect(() => {
    if (!data.pricing && roomGuestAssignments.length > 0) {
      calculatePricing();
    }
  }, [roomGuestAssignments, roomServiceAssignments]);

  const calculatePricing = async () => {
    setLoading(true);
    try {
      // ✅ Filtrar solo habitaciones con huéspedes asignados
      const roomsWithGuests = data.selectedRooms.filter(room =>
        roomGuestAssignments.some(a => a.roomId === room.id)
      );

      const roomIds = roomsWithGuests.map(r => r.id);

      // ✅ Calcular servicios totales desde roomServiceAssignments
      const servicesForAPI = roomServiceAssignments.reduce((acc, assignment) => {
        const existing = acc.find(s => s.serviceId === assignment.serviceId);
        const totalQuantity = assignment.quantity * assignment.dates.length;

        if (existing) {
          existing.quantity += totalQuantity;
        } else {
          acc.push({
            serviceId: assignment.serviceId,
            quantity: totalQuantity,
            customPrice: assignment.unitPrice
          });
        }
        return acc;
      }, []);

      const result = await reservationsService.calculatePrice(
        roomIds,
        servicesForAPI,
        data.checkInDate,
        data.checkOutDate,
        data.guests
      );

      setPricing(result);
      onUpdate({ pricing: result });
    } catch (error) {
      toast.error('Error al calcular el precio total');
    } finally {
      setLoading(false);
    }
  };

  // ✅ NUEVA: Calcular pricing desde asignaciones ya hechas (más preciso)
  const calculatePricingFromAssignments = () => {
    setLoading(true);
    try {
      const nights = calculateNights();

      // ✅ Filtrar solo habitaciones que tienen huéspedes asignados
      const roomsWithGuests = data.selectedRooms.filter(room => {
        return roomGuestAssignments.some(assignment => assignment.roomId === room.id);
      });

      // ✅ Generar roomsBreakdown solo para habitaciones con huéspedes
      const roomsBreakdown = roomsWithGuests.map(room => ({
        roomNumber: room.number,
        roomType: room.type,
        pricePerNight: room.price || 0,
        nights: nights,
        subtotal: (room.price || 0) * nights,
        seasonApplied: room.seasonName || null
      }));

      // Calcular total de habitaciones
      const roomsTotal = roomsBreakdown.reduce((sum, room) => sum + room.subtotal, 0);

      // Calcular total de servicios desde roomServiceAssignments
      const servicesTotal = roomServiceAssignments.reduce((sum, assignment) => {
        const assignmentTotal = assignment.unitPrice * assignment.quantity * assignment.dates.length;
        return sum + assignmentTotal;
      }, 0);

      const total = roomsTotal + servicesTotal;

      const calculatedPricing = {
        roomsTotal,
        roomsSubtotal: roomsTotal, // ✅ Alias para compatibilidad
        servicesTotal,
        total,
        nights: nights,
        rooms: roomsWithGuests.length, // ✅ Solo contar habitaciones con huéspedes
        roomsBreakdown // ✅ Agregar breakdown para el UI
      };

      setPricing(calculatedPricing);
      onUpdate({ pricing: calculatedPricing });
    } catch (error) {
      toast.error('Error al calcular el precio');
    } finally {
      setLoading(false);
    }
  };

  const calculateNights = () => {
    if (data.checkInDate && data.checkOutDate) {
      const start = new Date(data.checkInDate);
      const end = new Date(data.checkOutDate);
      const diffTime = Math.abs(end - start);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 0;
  };

  const nights = calculateNights();

  // ==================== FUNCIONES DE ASIGNACIÓN DE HUÉSPEDES ====================

  // ==================== NUEVA LÓGICA SIMPLIFICADA ====================

  // Obtener lista de TODOS los huéspedes (main + additional)
  const getAllGuests = () => {
    const guests = [];
    let idCounter = 1;

    // Main guest
    if (data.mainGuest && data.mainGuest.firstName) {
      guests.push({
        id: data.mainGuest.id || `guest-${idCounter++}`,
        name: `${data.mainGuest.firstName} ${data.mainGuest.paternalLastName || ''}`.trim(),
        isMain: true,
        fullData: data.mainGuest
      });
    }

    // Additional guests
    if (data.additionalGuests && data.additionalGuests.length > 0) {
      data.additionalGuests.forEach((guest) => {
        if (guest && guest.firstName) {
          guests.push({
            id: guest.id || `guest-${idCounter++}`,
            name: `${guest.firstName} ${guest.paternalLastName || ''}`.trim(),
            isMain: false,
            fullData: guest
          });
        }
      });
    }

    return guests;
  };

  // Obtener TODOS los IDs de huéspedes ya asignados (en TODAS las habitaciones)
  const getAllAssignedGuestIds = () => {
    return roomGuestAssignments.flatMap(room => room.guestIds);
  };

  // Obtener huéspedes NO asignados a NINGUNA habitación
  const getUnassignedGuests = () => {
    const allGuests = getAllGuests();
    const assignedIds = getAllAssignedGuestIds();
    return allGuests.filter(guest => !assignedIds.includes(guest.id));
  };

  // Agregar huésped a una habitación (CON VALIDACIONES ESTRICTAS)
  const addGuestToRoom = (roomId, guestId) => {
    // VALIDACIÓN 1: Verificar que el huésped NO esté asignado en NINGUNA habitación
    const assignedIds = getAllAssignedGuestIds();
    if (assignedIds.includes(guestId)) {
      toast.error('Este huésped ya está asignado a otra habitación');
      return;
    }

    setRoomGuestAssignments(prev =>
      prev.map(room => {
        if (room.roomId === roomId) {
          // VALIDACIÓN 2: Verificar capacidad
          if (room.guestIds.length >= room.capacity) {
            toast.error(`Habitación ${room.roomNumber} llena (capacidad: ${room.capacity})`);
            return room;
          }

          // ✅ Agregar huésped
          return {
            ...room,
            guestIds: [...room.guestIds, guestId]
          };
        }
        return room;
      })
    );
  };

  // Remover huésped de una habitación
  const removeGuestFromRoom = (roomId, guestId) => {
    setRoomGuestAssignments(prev =>
      prev.map(room => {
        if (room.roomId === roomId) {
          return {
            ...room,
            guestIds: room.guestIds.filter(id => id !== guestId)
          };
        }
        return room;
      })
    );
  };

  // Verificar si todas las asignaciones están completas
  // ✅ ACTUALIZADO: Verificar que haya asignaciones Y datos de huéspedes
  const areAssignmentsValid = () => {
    // 1. Verificar que hay asignaciones de habitaciones con huéspedes
    const totalAssigned = roomGuestAssignments.reduce((sum, room) => sum + room.guestIds.length, 0);
    if (totalAssigned === 0 || roomGuestAssignments.length === 0) {
      return false;
    }

    // 2. Verificar que hay datos del huésped principal
    if (!data.mainGuest || !data.mainGuest.firstName) {
      return false;
    }

    // 3. Si hay más de 1 huésped, verificar que hay datos de huéspedes adicionales
    if (data.guests > 1 && (!data.additionalGuests || data.additionalGuests.length === 0)) {
      return false;
    }

    return true;
  };

  // ✅ AUTO-ASIGNAR: Distribuir huéspedes equitativamente
  const autoAssignGuestsByCapacity = () => {
    const allGuests = getAllGuests();
    const rooms = data.selectedRooms;

    if (allGuests.length === 0) {
      toast.error('No hay huéspedes para asignar');
      return;
    }

    // ESTRATEGIA SIMPLE: 1 huésped por habitación primero, luego distribuir el resto
    const newAssignments = [];
    let guestIndex = 0;

    // PASO 1: Asignar 1 huésped a cada habitación
    for (const room of rooms) {
      const assignment = {
        roomId: room.id,
        roomNumber: room.number,
        roomType: room.type,
        capacity: room.capacity || 2,
        guestIds: []
      };

      if (guestIndex < allGuests.length) {
        assignment.guestIds.push(allGuests[guestIndex].id);
        guestIndex++;
      }

      newAssignments.push(assignment);
    }

    // PASO 2: Distribuir huéspedes restantes según capacidad
    for (const assignment of newAssignments) {
      while (assignment.guestIds.length < assignment.capacity && guestIndex < allGuests.length) {
        assignment.guestIds.push(allGuests[guestIndex].id);
        guestIndex++;
      }
    }

    setRoomGuestAssignments(newAssignments);
    toast.success(`${allGuests.length} huéspedes asignados automáticamente`);

    // ✅ Ya no es necesario aplicar servicios - vienen del Step 4
  };

  // ==================== FUNCIONES DE ASIGNACIÓN DE SERVICIOS ====================

  // Generar array de fechas entre check-in y check-out
  const getServiceDates = () => {
    if (!data.checkInDate || !data.checkOutDate) return [];

    const startDate = new Date(data.checkInDate);
    const endDate = new Date(data.checkOutDate);
    const dates = [];

    const currentDate = new Date(startDate);
    while (currentDate < endDate) {
      dates.push(currentDate.toISOString().split('T')[0]); // Formato YYYY-MM-DD
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  };

  // Agregar servicio a una habitación
  const addServiceToRoom = (roomId, serviceId) => {
    const service = data.selectedServices.find(s => s.id === serviceId);
    if (!service) return;

    // Verificar si ya existe
    const exists = roomServiceAssignments.some(
      rsa => rsa.roomId === roomId && rsa.serviceId === serviceId
    );

    if (exists) {
      toast.error('Este servicio ya está asignado a esta habitación');
      return;
    }

    const allDates = getServiceDates();

    setRoomServiceAssignments(prev => [
      ...prev,
      {
        roomId: roomId,
        serviceId: serviceId,
        serviceName: service.name,
        dates: allDates, // Por defecto, todas las fechas
        quantity: service.quantity || 1,
        unitPrice: service.customPrice || service.price,
      }
    ]);

    toast.success(`${service.name} agregado a la habitación`);
  };

  // ========== FUNCIONES DE EDICIÓN DE SERVICIOS ==========

  // Activar modo edición
  const startEditingServices = () => {
    setTempRoomServiceAssignments([...roomServiceAssignments]); // Copiar estado actual
    setIsEditingServices(true);
  };

  // Confirmar cambios (guardar tempRoomServiceAssignments → roomServiceAssignments)
  const confirmServiceChanges = () => {
    setRoomServiceAssignments([...tempRoomServiceAssignments]);
    setIsEditingServices(false);
    recalculateServicesPricing(tempRoomServiceAssignments); // ✅ Recalcular precio
    toast.success('Cambios en servicios guardados');
  };

  // Cancelar cambios (descartar tempRoomServiceAssignments)
  const cancelServiceChanges = () => {
    setTempRoomServiceAssignments([]);
    setIsEditingServices(false);
    toast.info('Cambios cancelados');
  };

  // Recalcular precio total de servicios
  const recalculateServicesPricing = (assignments) => {
    const servicesTotal = assignments.reduce((sum, rsa) => {
      const totalForService = rsa.unitPrice * rsa.quantity * rsa.dates.length;
      return sum + totalForService;
    }, 0);

    // Actualizar pricing
    if (pricing) {
      const newTotal = pricing.roomsTotal + servicesTotal;
      setPricing(prev => ({
        ...prev,
        servicesTotal,
        total: newTotal
      }));
    }
  };

  // Remover servicio de una habitación
  const removeServiceFromRoom = (roomId, serviceId) => {
    const setter = isEditingServices ? setTempRoomServiceAssignments : setRoomServiceAssignments;
    setter(prev =>
      prev.filter(rsa => !(rsa.roomId === roomId && rsa.serviceId === serviceId))
    );
  };

  // Actualizar cantidad de un servicio
  const updateServiceQuantity = (roomId, serviceId, quantity) => {
    const setter = isEditingServices ? setTempRoomServiceAssignments : setRoomServiceAssignments;
    setter(prev =>
      prev.map(rsa => {
        if (rsa.roomId === roomId && rsa.serviceId === serviceId) {
          return { ...rsa, quantity: parseInt(quantity) || 1 };
        }
        return rsa;
      })
    );
  };

  // Actualizar fechas de un servicio
  const updateServiceDates = (roomId, serviceId, dates) => {
    const setter = isEditingServices ? setTempRoomServiceAssignments : setRoomServiceAssignments;
    setter(prev =>
      prev.map(rsa => {
        if (rsa.roomId === roomId && rsa.serviceId === serviceId) {
          return { ...rsa, dates: dates };
        }
        return rsa;
      })
    );
  };

  // Toggle fecha específica
  const toggleServiceDate = (roomId, serviceId, date) => {
    setRoomServiceAssignments(prev =>
      prev.map(rsa => {
        if (rsa.roomId === roomId && rsa.serviceId === serviceId) {
          const currentDates = rsa.dates || [];
          const dateExists = currentDates.includes(date);

          return {
            ...rsa,
            dates: dateExists
              ? currentDates.filter(d => d !== date)
              : [...currentDates, date].sort()
          };
        }
        return rsa;
      })
    );
  };

  // Obtener servicios disponibles para una habitación (no asignados aún)
  const getAvailableServices = (roomId) => {
    if (!data.selectedServices || data.selectedServices.length === 0) return [];

    const assignedServiceIds = roomServiceAssignments
      .filter(rsa => rsa.roomId === roomId)
      .map(rsa => rsa.serviceId);

    return data.selectedServices.filter(service => !assignedServiceIds.includes(service.id));
  };

  // Aplicar servicio a TODAS las habitaciones
  const applyServiceToAllRooms = (serviceId) => {
    const service = data.selectedServices.find(s => s.id === serviceId);
    if (!service) return;

    const allDates = getServiceDates();

    const newAssignments = data.selectedRooms.map(room => ({
      roomId: room.id,
      serviceId: service.id,
      serviceName: service.name,
      dates: allDates,
      quantity: service.quantity || 1,
      unitPrice: service.customPrice || service.price,
    }));

    setRoomServiceAssignments(prev => {
      // Filtrar duplicados (remover asignaciones previas de este servicio)
      const filtered = prev.filter(rsa => rsa.serviceId !== service.id);
      return [...filtered, ...newAssignments];
    });

    toast.success(`${service.name} aplicado a ${data.selectedRooms.length} habitaciones`);
  };

  // ==================== FIN FUNCIONES DE SERVICIOS ====================

  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);

    // Si es efectivo completo, establecer monto total por defecto
    if (method === 'cash' && pricing) {
      setPaymentAmount(pricing.total);
      setPaymentPreset(PAYMENT_PRESETS.FULL);
    }
  };

  const handlePresetChange = (preset) => {
    setPaymentPreset(preset);

    if (!pricing) return;

    switch (preset) {
      case PAYMENT_PRESETS.FULL:
        setPaymentAmount(pricing.total);
        break;
      case PAYMENT_PRESETS.HALF:
        setPaymentAmount(Math.ceil(pricing.total / 2));
        break;
      case PAYMENT_PRESETS.FIRST_NIGHT:
        // Calcular precio de primera noche
        const roomsSubtotal = pricing.roomsSubtotal || pricing.roomsTotal || 0;
        const firstNightPrice = Math.ceil(roomsSubtotal / nights);
        setPaymentAmount(firstNightPrice);
        break;
      case PAYMENT_PRESETS.CUSTOM:
        // Dejar que el usuario ingrese
        break;
    }
  };

  const handleAmountChange = (value) => {
    const amount = parseInt(value) || 0;
    setPaymentAmount(amount);
    setPaymentPreset(PAYMENT_PRESETS.CUSTOM);
  };

  const addPaymentMethod = () => {
    if (!paymentMethod || paymentAmount <= 0) {
      toast.error('Seleccione método y monto válido');
      return;
    }

    const totalPaid = multiplePayments.reduce((sum, p) => sum + p.amount, 0) + paymentAmount;

    if (totalPaid > (pricing?.total || 0)) {
      toast.error('El total de pagos excede el monto de la reserva');
      return;
    }

    setMultiplePayments([
      ...multiplePayments,
      {
        method: paymentMethod,
        amount: paymentAmount,
      }
    ]);

    // Reset
    setPaymentMethod('');
    setPaymentAmount(0);
    setPaymentPreset(PAYMENT_PRESETS.FULL);
  };

  const removePayment = (index) => {
    setMultiplePayments(multiplePayments.filter((_, i) => i !== index));
  };

  const getTotalPaid = () => {
    if (showMultiplePayments) {
      return multiplePayments.reduce((sum, p) => sum + p.amount, 0);
    }
    return paymentAmount;
  };

  const remainingAmount = pricing ? pricing.total - getTotalPaid() : 0;

  const getPaymentMethodLabel = (method) => {
    const labels = {
      cash: 'Efectivo',
      bank_transfer: 'Transferencia',
      credit_card: 'Tarjeta de Crédito',
      debit_card: 'Tarjeta de Débito',
    };
    return labels[method] || method;
  };

  const handleConfirm = () => {
    const totalPaid = getTotalPaid();

    // Validar asignación de huéspedes
    if (!areAssignmentsValid()) {
      toast.error('Debe asignar todos los huéspedes a las habitaciones');
      return;
    }

    // Validar asignación de servicios (ya no es necesario porque se auto-aplican)
    // Si el usuario eliminó manualmente TODAS las asignaciones, advertir
    if (data.selectedServices && data.selectedServices.length > 0 && roomServiceAssignments.length === 0) {
      const confirmProceed = window.confirm(
        'Ha eliminado todas las asignaciones de servicios.\n\n' +
        '¿Desea continuar sin servicios? Los servicios seleccionados no se aplicarán a la reserva.'
      );
      if (!confirmProceed) return;
    }

    if (showMultiplePayments) {
      if (multiplePayments.length === 0) {
        toast.error('Debe agregar al menos un método de pago');
        return;
      }
    } else {
      if (!paymentMethod) {
        toast.error('Debe seleccionar un método de pago');
        return;
      }

      if (totalPaid <= 0) {
        toast.error('El monto a pagar debe ser mayor a 0');
        return;
      }
    }

    if (pricing && totalPaid > pricing.total) {
      toast.error('El monto no puede ser mayor al total');
      return;
    }

    if (!channel) {
      toast.error('Debe seleccionar el canal de contacto');
      return;
    }

    // ✅ FILTRAR habitaciones sin huéspedes asignados
    const roomsWithGuests = roomGuestAssignments.filter(room => room.guestIds.length > 0);

    if (roomsWithGuests.length === 0) {
      toast.error('Debe asignar al menos un huésped a una habitación');
      return;
    }

    // Si se filtraron habitaciones, advertir al usuario
    if (roomsWithGuests.length < roomGuestAssignments.length) {
      const removedRooms = roomGuestAssignments.length - roomsWithGuests.length;
      toast.warning(
        `Se excluyeron ${removedRooms} habitación(es) sin huéspedes asignados`,
        { duration: 4000 }
      );
    }

    // ✅ FILTRAR servicios de habitaciones excluidas
    const validRoomIds = roomsWithGuests.map(r => r.roomId);
    const filteredRoomServiceAssignments = roomServiceAssignments.filter(rsa =>
      validRoomIds.includes(rsa.roomId) && rsa.dates && rsa.dates.length > 0
    );

    // Nota: El mapeo de IDs temporales a IDs reales se hace en ReservationStepper
    // Aquí solo enviamos las asignaciones tal cual (con IDs temporales o reales)
    const paymentData = {
      paymentMethod: showMultiplePayments ? 'multiple' : paymentMethod,
      paymentAmount: totalPaid,
      paymentType: paymentType,
      isDeposit: pricing ? totalPaid < pricing.total : false,
      multiplePayments: showMultiplePayments ? multiplePayments : undefined,
      channel: channel,
      roomGuestAssignments: roomsWithGuests.map(room => ({
        roomId: room.roomId,
        guestIds: room.guestIds
      })),
      roomServiceAssignments: filteredRoomServiceAssignments.map(rsa => ({
        roomId: rsa.roomId,
        serviceId: rsa.serviceId,
        dates: rsa.dates,
        quantity: rsa.quantity,
        unitPrice: rsa.unitPrice
      })),
    };

    // Actualizar datos primero
    onUpdate(paymentData);

    // Llamar a onCreate inmediatamente con los datos de pago
    setCreating(true);

    // ✅ Llamar directamente a onCreate pasando los datos de pago
    onCreate(paymentData);
  };

  if (loading) {
    return <div className="text-center py-8">Calculando totales...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Resumen y Confirmación
        </h2>
        <p className="text-muted-foreground">
          Revise los detalles de la reserva antes de confirmar
        </p>
      </div>

      {/* Reservation Details */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <PhoneIcon className="h-5 w-5" /> {/* O ChatBubbleIcon */}
            ¿Cómo contactó el cliente?
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={channel === 'chatbot' ? 'default' : 'outline'}
              onClick={() => setChannel('chatbot')}
              className="h-auto py-4"
            >
              <div className="flex flex-col items-center gap-2">
                <ChatBubbleLeftRightIcon className="h-6 w-6" />
                <span className="text-sm font-medium">ChatBot/WhatsApp</span>
              </div>
            </Button>

            <Button
              variant={channel === 'reception' ? 'default' : 'outline'}
              onClick={() => setChannel('reception')}
              className="h-auto py-4"
            >
              <div className="flex flex-col items-center gap-2">
                <PhoneIcon className="h-6 w-6" />
                <span className="text-sm font-medium">Llamada Telefónica</span>
              </div>
            </Button>

            <Button
              variant={channel === 'walk_in' ? 'default' : 'outline'}
              onClick={() => setChannel('walk_in')}
              className="h-auto py-4"
            >
              <div className="flex flex-col items-center gap-2">
                <UserIcon className="h-6 w-6" />
                <span className="text-sm font-medium">Walk-in</span>
                <span className="text-xs text-muted-foreground">Sin reserva previa</span>
              </div>
            </Button>

            <Button
              variant={channel === 'in_person' ? 'default' : 'outline'}
              onClick={() => setChannel('in_person')}
              className="h-auto py-4"
            >
              <div className="flex flex-col items-center gap-2">
                <CheckBadgeIcon className="h-6 w-6" />
                <span className="text-sm font-medium">Presencial con Cita</span>
              </div>
            </Button>
          </div>

          {!channel && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              Por favor selecciona cómo contactó el cliente
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Detalles de la Reserva
          </h3>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Check-in</p>
              <p className="font-medium">
                {format(new Date(data.checkInDate), 'PPP', { locale: es })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Check-out</p>
              <p className="font-medium">
                {format(new Date(data.checkOutDate), 'PPP', { locale: es })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">{nights} noches</Badge>
            <Badge variant="outline">
              <Users className="h-3 w-3 mr-1" />
              {data.guests} huéspedes
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Guest Information */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5" />
            Huéspedes
          </h3>

          <div className="space-y-2">
            {/* Huésped Principal con botón de detalles */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Huésped Principal</p>
                  <Badge variant="default">Principal</Badge>
                </div>
                <p className="font-medium">
                  {data.mainGuest?.firstName} {data.mainGuest?.paternalLastName}
                </p>
                <p className="text-sm text-muted-foreground">{data.mainGuest?.email}</p>
              </div>
              <GuestDetailsModal
                guest={data.mainGuest}
                trigger={
                  <Button variant="outline" size="sm">
                    Ver detalles
                  </Button>
                }
              />
            </div>

            {/* Huéspedes Adicionales */}
            {data.additionalGuests && data.additionalGuests.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground font-medium">Huéspedes Adicionales</p>
                {data.additionalGuests.map((guest, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">
                        {guest.firstName} {guest.paternalLastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{guest.email}</p>
                    </div>
                    <GuestDetailsModal
                      guest={guest}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Ver
                        </Button>
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ✅ SIMPLIFICADO: Distribución de Huéspedes (Solo Lectura) */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Distribución de Huéspedes
          </h3>

          {/* ⚠️ Verificar si hay datos de huéspedes */}
          {!data.mainGuest || (data.guests > 1 && (!data.additionalGuests || data.additionalGuests.length === 0)) ? (
            <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-orange-800 dark:text-orange-200">
                <p className="font-medium">Datos de huéspedes incompletos</p>
                <p className="mt-1">
                  Debes completar los pasos "Huésped Principal" y "Huéspedes Adicionales" antes de continuar.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {roomGuestAssignments.map((room, roomIndex) => {
                // ✅ Obtener lista de todos los huéspedes en orden
                const allGuestsInOrder = [];
                if (data.mainGuest && data.mainGuest.firstName) {
                  allGuestsInOrder.push({
                    id: `guest-1`,
                    name: `${data.mainGuest.firstName} ${data.mainGuest.paternalLastName || ''}`.trim(),
                    isMain: true
                  });
                }
                if (data.additionalGuests && data.additionalGuests.length > 0) {
                  data.additionalGuests.forEach((guest, index) => {
                    if (guest && guest.firstName) {
                      allGuestsInOrder.push({
                        id: `guest-${index + 2}`,
                        name: `${guest.firstName} ${guest.paternalLastName || ''}`.trim(),
                        isMain: false
                      });
                    }
                  });
                }

                // ✅ Mapear IDs de la habitación a huéspedes
                const roomGuests = room.guestIds
                  .map(guestId => {
                    const found = allGuestsInOrder.find(g => g.id === guestId);
                    return found;
                  })
                  .filter(Boolean);

                return (
                  <div key={room.roomId} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Habitación {room.roomNumber} - {room.roomType}</p>
                        <p className="text-xs text-muted-foreground">
                          {roomGuests.length} huésped(es) · Capacidad {room.capacity}
                        </p>
                      </div>
                    </div>

                    {/* Lista de huéspedes (solo lectura) */}
                    {roomGuests.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {roomGuests.map((guest, idx) => (
                          <Badge key={`${room.roomId}-${idx}`} variant="outline" className="text-xs">
                            {guest.name}
                            {guest.isMain && ' ⭐'}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Sin huéspedes asignados</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </CardContent>
      </Card>

      {/* Rooms */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Home className="h-5 w-5" />
            Habitaciones ({roomGuestAssignments.length})
          </h3>

          {/* ✅ Solo mostrar habitaciones que tienen huéspedes asignados */}
          {data.selectedRooms
            .filter(room => roomGuestAssignments.some(a => a.roomId === room.id))
            .map((room) => {
              const roomPricing = pricing?.roomsBreakdown?.find(
                r => r.roomNumber === room.number
              );
              return (
                <div key={room.id} className="flex justify-between items-start text-sm">
                  <div>
                    <p className="font-medium">Hab. {room.number} - {room.type}</p>
                    <p className="text-muted-foreground">
                      ${roomPricing?.pricePerNight.toLocaleString()}/noche × {nights} noches
                    </p>
                    {roomPricing?.seasonApplied && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        {roomPricing.seasonApplied}
                      </Badge>
                    )}
                  </div>
                  <p className="font-semibold">
                    ${roomPricing?.subtotal.toLocaleString()}
                  </p>
                </div>
              );
            })}

          <Separator />

          <div className="flex justify-between font-semibold">
            <span>Subtotal Habitaciones</span>
            <span>${(pricing?.roomsSubtotal || pricing?.roomsTotal || 0).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Room Service Assignments */}
      {data.selectedServices && data.selectedServices.length > 0 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Servicios Aplicados
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!showServiceAssignments) {
                    // Al abrir panel, activar modo edición
                    startEditingServices();
                  }
                  setShowServiceAssignments(!showServiceAssignments);
                }}
              >
                {showServiceAssignments ? 'Ocultar detalles' : 'Editar asignaciones'}
              </Button>
            </div>

            {/* ✅ SIMPLIFICADO: Solo mostrar resumen de servicios ya asignados */}
            {!showServiceAssignments && roomServiceAssignments.length > 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-lg space-y-2">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  ✅ {roomServiceAssignments.length} servicio(s) asignado(s) a habitaciones
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Haga clic en "Editar asignaciones" para ver o modificar los detalles
                </p>
              </div>
            )}

            {/* ✅ SIMPLIFICADO: Si no hay servicios, solo informar */}
            {!showServiceAssignments && roomServiceAssignments.length === 0 && (
              <div className="p-3 bg-muted/50 border border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground text-center">
                  No se asignaron servicios adicionales
                </p>
              </div>
            )}

            {/* Panel expandido - Solo se muestra si showServiceAssignments es true */}
            {showServiceAssignments && (
              <>
                {/* Aplicar a todas las habitaciones */}
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Atajo rápido:</p>
                    <p className="text-xs text-muted-foreground">
                      Aplica un servicio a todas las habitaciones simultáneamente
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {data.selectedServices.map(service => (
                      <Button
                        key={service.id}
                        variant="outline"
                        size="sm"
                        onClick={() => applyServiceToAllRooms(service.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {service.name} a todas
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium">¿Cómo funciona?</p>
                    <p className="mt-1">
                      Seleccione qué servicios aplicarán a cada habitación y en qué fechas.
                      Por defecto, se asignan todas las noches de la estadía.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {data.selectedRooms.map((room) => {
                    const availableServices = getAvailableServices(room.id);
                    // ✅ Usar estado temporal si está en modo edición
                    const currentAssignments = isEditingServices ? tempRoomServiceAssignments : roomServiceAssignments;
                    const assignedServices = currentAssignments.filter(rsa => rsa.roomId === room.id);
                    const serviceDates = getServiceDates();

                    return (
                      <div key={room.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Habitación {room.number} - {room.type}</p>
                            <p className="text-sm text-muted-foreground">
                              {assignedServices.length} servicio(s) asignado(s)
                            </p>
                          </div>
                          {availableServices.length > 0 && (
                            <Select onValueChange={(value) => addServiceToRoom(room.id, parseInt(value))}>
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="+ Agregar servicio" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableServices.map(service => (
                                  <SelectItem key={service.id} value={service.id.toString()}>
                                    {service.name} (${service.customPrice || service.price})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>

                        {/* Lista de servicios asignados */}
                        {assignedServices.length > 0 ? (
                          <div className="space-y-3">
                            {assignedServices.map(rsa => (
                              <div
                                key={`${rsa.roomId}-${rsa.serviceId}`}
                                className="border rounded-md p-3 space-y-3 bg-muted/30"
                              >
                                {/* Encabezado del servicio */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Receipt className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">{rsa.serviceName}</span>
                                    <Badge variant="outline" className="text-xs">
                                      ${rsa.unitPrice.toLocaleString()}
                                    </Badge>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeServiceFromRoom(room.id, rsa.serviceId)}
                                    className="h-7 w-7 p-0"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>

                                {/* Cantidad */}
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs">Cantidad por día:</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={rsa.quantity}
                                    onChange={(e) => updateServiceQuantity(room.id, rsa.serviceId, e.target.value)}
                                    className="w-20 h-8 text-sm"
                                  />
                                </div>

                                {/* Selector de fechas */}
                                <div className="space-y-2">
                                  <Label className="text-xs">Fechas:</Label>
                                  <div className="grid grid-cols-2 gap-2">
                                    {serviceDates.map(date => {
                                      const isSelected = rsa.dates.includes(date);
                                      const dateObj = new Date(date + 'T12:00:00'); // Evitar problemas de timezone
                                      const formattedDate = format(dateObj, 'EEE d MMM', { locale: es });

                                      return (
                                        <div
                                          key={date}
                                          className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50 cursor-pointer"
                                          onClick={() => toggleServiceDate(room.id, rsa.serviceId, date)}
                                        >
                                          <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => toggleServiceDate(room.id, rsa.serviceId, date)}
                                          />
                                          <Label className="text-xs cursor-pointer flex-1">
                                            {formattedDate}
                                          </Label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {rsa.dates.length} de {serviceDates.length} noches seleccionadas
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-sm text-muted-foreground border-2 border-dashed rounded-md">
                            No hay servicios asignados a esta habitación
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ✅ BOTONES CONFIRMAR/CANCELAR - Solo si está en modo edición */}
                {isEditingServices && (
                  <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border-t">
                    <div className="flex-1 text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-medium">Modo Edición Activo</p>
                      <p className="text-xs">Los cambios no se guardarán hasta que confirme</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelServiceChanges}
                        className="border-gray-300"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={confirmServiceChanges}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Confirmar Cambios
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Services */}
      {data.selectedServices && data.selectedServices.length > 0 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Servicios Adicionales
            </h3>

            {data.selectedServices.map((service) => {
              const servicePricing = pricing?.servicesBreakdown.find(
                s => s.serviceId === service.id
              );
              return (
                <div key={service.id} className="flex justify-between text-sm">
                  <div>
                    <span>{service.name}</span>
                    {service.unit === 'custom' && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Precio personalizado: ${service.customPrice?.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                  <span className="font-semibold">
                    ${servicePricing?.subtotal.toLocaleString()}
                  </span>
                </div>
              );
            })}

            <Separator />

            <div className="flex justify-between font-semibold">
              <span>Subtotal Servicios</span>
              <span>${pricing?.servicesSubtotal.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total */}
      <Card className="border-primary">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center text-2xl font-bold">
            <span>TOTAL</span>
            <span className="text-primary">${pricing?.total.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Configuración de Pago
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMultiplePayments(!showMultiplePayments)}
            >
              {showMultiplePayments ? 'Pago simple' : 'Pago mixto'}
            </Button>
          </div>

          {/* ❌ ELIMINADO: Esquema de Pago duplicado - Solo usar "Monto a pagar ahora" */}

          {showMultiplePayments ? (
            // Pagos múltiples
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-2">Agregar método de pago</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Método</Label>
                    <Tabs value={paymentMethod} onValueChange={setPaymentMethod}>
                      <TabsList className="grid grid-cols-2">
                        <TabsTrigger value="cash">
                          <Banknote className="h-4 w-4 mr-1" />
                          Efectivo
                        </TabsTrigger>
                        <TabsTrigger value="bank_transfer">
                          <CreditCard className="h-4 w-4 mr-1" />
                          Transferencia
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  <div className="space-y-2">
                    <Label>Monto</Label>
                    <Input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="Monto"
                      min="0"
                    />
                  </div>
                </div>

                <Button
                  onClick={addPaymentMethod}
                  className="w-full mt-3"
                  size="sm"
                  variant="outline"
                >
                  Agregar
                </Button>
              </div>

              {multiplePayments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Pagos registrados:</p>
                  {multiplePayments.map((payment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        {payment.method === 'cash' ? (
                          <Banknote className="h-4 w-4" />
                        ) : (
                          <CreditCard className="h-4 w-4" />
                        )}
                        <span className="text-sm">{getPaymentMethodLabel(payment.method)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">${payment.amount.toLocaleString()}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePayment(index)}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Pago simple
            <div className="space-y-4">
              <Tabs value={paymentMethod} onValueChange={handlePaymentMethodChange}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="cash">
                    <Banknote className="h-4 w-4 mr-2" />
                    Efectivo
                  </TabsTrigger>
                  <TabsTrigger value="bank_transfer">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Transferencia
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {paymentMethod && (
                <>
                  <Separator />

                  <div className="space-y-3">
                    <Label>Monto a pagar ahora</Label>

                    <Tabs value={paymentPreset} onValueChange={handlePresetChange}>
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value={PAYMENT_PRESETS.FULL}>Total</TabsTrigger>
                        <TabsTrigger value={PAYMENT_PRESETS.HALF}>50%</TabsTrigger>
                        <TabsTrigger value={PAYMENT_PRESETS.FIRST_NIGHT}>1ra Noche</TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <div className="space-y-2">
                      <Label>Monto personalizado</Label>
                      <Input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        placeholder="Ingrese monto"
                        min="0"
                        max={pricing?.total || 0}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {getTotalPaid() > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total reserva:</span>
                  <span className="font-semibold">${pricing?.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pago inicial:</span>
                  <span className="font-semibold text-green-600">${getTotalPaid().toLocaleString()}</span>
                </div>
                {remainingAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Saldo restante:</span>
                    <span className="font-semibold text-orange-600">${remainingAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {remainingAmount > 0 && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="font-semibold">Saldo pendiente: ${remainingAmount.toLocaleString()}</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    A pagar al momento del check-in
                  </p>
                </div>
              )}
            </>
          )}

          {paymentMethod === 'bank_transfer' && (
            <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-orange-900 dark:text-orange-100">
                  Nota importante
                </p>
                <p className="text-orange-800 dark:text-orange-200 mt-1">
                  La reserva quedará en estado PENDIENTE hasta que el recepcionista
                  confirme el pago recibido. Las habitaciones se bloquean por 24 horas.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment Summary */}
      {areAssignmentsValid() && (
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-semibold text-green-900 dark:text-green-100 flex items-center gap-2">
              ✅ Resumen de Asignaciones
            </h3>

            {/* Huéspedes por habitación */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-green-900 dark:text-green-100">
                Distribución de Huéspedes:
              </Label>
              <div className="space-y-1.5">
                {roomGuestAssignments.map(rga => {
                  const room = data.selectedRooms.find(r => r.id === rga.roomId);
                  const guests = rga.guestIds.map(gId =>
                    getAllGuests().find(g => g.id === gId)
                  ).filter(Boolean);

                  if (guests.length === 0) return null;

                  return (
                    <div
                      key={rga.roomId}
                      className="flex items-start gap-2 p-2 bg-white dark:bg-green-950/40 rounded-md text-sm"
                    >
                      <Home className="h-4 w-4 mt-0.5 text-green-700 dark:text-green-400 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="font-medium text-green-900 dark:text-green-100">
                          Hab. {room?.number}:
                        </span>
                        <span className="ml-2 text-green-800 dark:text-green-200">
                          {guests.map(g => g.name).join(', ')}
                        </span>
                        <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                          ({guests.length}/{room?.capacity || 2})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Servicios por habitación */}
            {roomServiceAssignments.length > 0 && (
              <>
                <Separator className="bg-green-200" />
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-green-900 dark:text-green-100">
                    Servicios Asignados:
                  </Label>
                  <div className="space-y-1.5">
                    {roomServiceAssignments.map(rsa => {
                      const room = data.selectedRooms.find(r => r.id === rsa.roomId);

                      return (
                        <div
                          key={`${rsa.roomId}-${rsa.serviceId}`}
                          className="flex items-start gap-2 p-2 bg-white dark:bg-green-950/40 rounded-md text-sm"
                        >
                          <Receipt className="h-4 w-4 mt-0.5 text-green-700 dark:text-green-400 flex-shrink-0" />
                          <div className="flex-1">
                            <span className="font-medium text-green-900 dark:text-green-100">
                              Hab. {room?.number}:
                            </span>
                            <span className="ml-2 text-green-800 dark:text-green-200">
                              {rsa.serviceName} × {rsa.quantity}
                            </span>
                            <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                              ({rsa.dates.length} {rsa.dates.length === 1 ? 'día' : 'días'})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {roomServiceAssignments.length === 0 && data.selectedServices && data.selectedServices.length > 0 && (
              <>
                <Separator className="bg-green-200" />
                <div className="p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 rounded-md">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    ⚠️ Nota: Hay servicios seleccionados pero no asignados a habitaciones
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Volver
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={getTotalPaid() <= 0 || creating || !areAssignmentsValid()}
          size="lg"
        >
          {creating ? 'Creando Reserva...' : '✓ Confirmar Reserva'}
        </Button>
      </div>
    </div>
  );
};

export default Step6Summary;