import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Separator } from '@/components/ui/Separator';
import { Badge } from '@/components/ui/Badge';
import { Calendar, Users, Home, DollarSign, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { reservationsService } from '@/services/reservations';

const Step6Summary = ({ data, onUpdate, onBack, onCreate }) => {
  const [paymentMethod, setPaymentMethod] = useState(data.paymentMethod || '');
  const [paymentAmount, setPaymentAmount] = useState(data.paymentAmount || 0);
  const [pricing, setPricing] = useState(data.pricing || null);
  const [loading, setLoading] = useState(!data.pricing);
  const [creating, setCreating] = useState(false);

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
        data.selectedServices.map(s => ({ serviceId: s.id, quantity: s.quantity })),
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

  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
    
    // Si es efectivo completo, establecer monto total por defecto
    if (method === 'cash' && pricing) {
      setPaymentAmount(pricing.total);
    }
  };

  const handleAmountChange = (value) => {
    const amount = parseInt(value) || 0;
    setPaymentAmount(amount);
  };

  const handleConfirm = () => {
    if (!paymentMethod) {
      toast.error('Debe seleccionar un método de pago');
      return;
    }

    if (paymentAmount <= 0) {
      toast.error('El monto a pagar debe ser mayor a 0');
      return;
    }

    if (pricing && paymentAmount > pricing.total) {
      toast.error('El monto no puede ser mayor al total');
      return;
    }

    onUpdate({
      paymentMethod,
      paymentAmount,
      isDeposit: pricing ? paymentAmount < pricing.total : false,
    });

    setCreating(true);
    onCreate();
  };

  if (loading) {
    return <div className="text-center py-8">Calculando totales...</div>;
  }

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
  const remainingAmount = pricing ? pricing.total - paymentAmount : 0;

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
            <div>
              <p className="text-sm text-muted-foreground">Huésped Principal</p>
              <p className="font-medium">
                {data.mainGuest?.firstName} {data.mainGuest?.paternalLastName}
              </p>
              <p className="text-sm text-muted-foreground">{data.mainGuest?.email}</p>
            </div>

            {data.additionalGuests && data.additionalGuests.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Huéspedes Adicionales</p>
                {data.additionalGuests.map((guest, index) => (
                  <p key={index} className="text-sm">
                    • {guest.firstName} {guest.paternalLastName}
                  </p>
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
            <h3 className="font-semibold text-foreground">Servicios Adicionales</h3>
            
            {data.selectedServices.map((service) => {
              const servicePricing = pricing?.servicesBreakdown.find(
                s => s.serviceId === service.id
              );
              return (
                <div key={service.id} className="flex justify-between text-sm">
                  <span>{service.name}</span>
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
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Forma de Pago
          </h3>

          <div className="space-y-4">
            <div className="space-y-3">
              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  paymentMethod === 'cash' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onClick={() => handlePaymentMethodChange('cash')}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'cash' ? 'border-primary' : 'border-muted-foreground'
                  }`}>
                    {paymentMethod === 'cash' && (
                      <div className="h-3 w-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Efectivo</p>
                    <p className="text-sm text-muted-foreground">
                      Pago en recepción (confirmación inmediata)
                    </p>
                  </div>
                </div>
              </div>

              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  paymentMethod === 'bank_transfer' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onClick={() => handlePaymentMethodChange('bank_transfer')}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === 'bank_transfer' ? 'border-primary' : 'border-muted-foreground'
                  }`}>
                    {paymentMethod === 'bank_transfer' && (
                      <div className="h-3 w-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Transferencia Bancaria</p>
                    <p className="text-sm text-muted-foreground">
                      Requiere confirmación posterior por recepcionista
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {paymentMethod && (
              <>
                <Separator />
                
                <div className="space-y-3">
                  <Label>Monto a pagar/abonar ahora</Label>
                  
                  <div className="space-y-2">
                    <div 
                      className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                      onClick={() => setPaymentAmount(pricing?.total || 0)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Total completo</span>
                        <span className="font-semibold">${pricing?.total.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Reserva confirmada inmediatamente
                      </p>
                    </div>

                    <div 
                      className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                      onClick={() => setPaymentAmount(Math.floor((pricing?.total || 0) / 2))}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Abono 50%</span>
                        <span className="font-semibold">
                          ${Math.floor((pricing?.total || 0) / 2).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Saldo restante al check-in
                      </p>
                    </div>

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
                </div>

                {paymentAmount > 0 && paymentAmount < (pricing?.total || 0) && (
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <p className="font-semibold">Saldo restante: ${remainingAmount.toLocaleString()}</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      A pagar al momento del check-in
                    </p>
                  </div>
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
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Volver
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!paymentMethod || paymentAmount <= 0 || creating}
          size="lg"
        >
          {creating ? 'Creando Reserva...' : '✓ Confirmar Reserva'}
        </Button>
      </div>
    </div>
  );
};

export default Step6Summary;