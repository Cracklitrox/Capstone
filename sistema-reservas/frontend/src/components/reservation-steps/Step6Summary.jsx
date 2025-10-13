import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Separator } from '@/components/ui/Separator';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Calendar, Users, Home, DollarSign, AlertCircle, Receipt, CreditCard, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { reservationsService } from '@/services/reservations';
import { GuestDetailsModal } from '@/components/GuestDetailsModal';
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
  const [pricing, setPricing] = useState(data.pricing || null);
  const [loading, setLoading] = useState(!data.pricing);
  const [creating, setCreating] = useState(false);
  const [channel, setChannel] = useState(data.channel || '');

  // Pagos múltiples
  const [multiplePayments, setMultiplePayments] = useState([]);
  const [showMultiplePayments, setShowMultiplePayments] = useState(false);

  useEffect(() => {
    if (creating && data.paymentMethod && data.paymentAmount > 0) {
      onCreate();
    }
  }, [data.paymentMethod, data.paymentAmount, creating, onCreate]);

  useEffect(() => {
    if (!data.pricing) {
      calculatePricing();
    }
  }, []);

  const calculatePricing = async () => {
    setLoading(true);
    try {
      const result = await reservationsService.calculatePrice(
        data.selectedRooms.map(r => r.id),
        data.selectedServices.map(s => ({ 
          serviceId: s.id, 
          quantity: s.quantity,
          customPrice: s.customPrice || s.price
        })),
        data.checkInDate,
        data.checkOutDate,
        data.guests
      );
      setPricing(result);
      onUpdate({ pricing: result });
    } catch (error) {
      console.error('Error al calcular precio:', error);
      toast.error('Error al calcular el precio total');
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
        const firstNightPrice = Math.ceil(pricing.roomsSubtotal / nights);
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

    const paymentData = {
      paymentMethod: showMultiplePayments ? 'multiple' : paymentMethod,
      paymentAmount: totalPaid,
      isDeposit: pricing ? totalPaid < pricing.total : false,
      multiplePayments: showMultiplePayments ? multiplePayments : undefined,
      channel: channel,
    };

    onUpdate(paymentData);
    setCreating(true);
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

      {/* Rooms */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Home className="h-5 w-5" />
            Habitaciones
          </h3>
          
          {data.selectedRooms.map((room) => {
            const roomPricing = pricing?.roomsBreakdown.find(
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
            <span>${pricing?.roomsSubtotal.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

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
              Forma de Pago
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMultiplePayments(!showMultiplePayments)}
            >
              {showMultiplePayments ? 'Pago simple' : 'Pago mixto'}
            </Button>
          </div>

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

      {/* Buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Volver
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={getTotalPaid() <= 0 || creating}
          size="lg"
        >
          {creating ? 'Creando Reserva...' : '✓ Confirmar Reserva'}
        </Button>
      </div>
    </div>
  );
};

export default Step6Summary;