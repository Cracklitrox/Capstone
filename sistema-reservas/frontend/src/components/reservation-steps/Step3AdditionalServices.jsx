import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Separator } from '@/components/ui/Separator';
import { CheckCircle2, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { reservationsService } from '@/services/reservations';

const Step3AdditionalServices = ({ data, onUpdate, onNext, onBack }) => {
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState(data.selectedServices || []);
  const [loading, setLoading] = useState(true);
  
  const { guests, checkInDate, checkOutDate } = data;

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const result = await reservationsService.getAvailableServices();
      setServices(result);
    } catch (error) {
      console.error('Error al cargar servicios:', error);
      toast.error('Error al cargar servicios');
    } finally {
      setLoading(false);
    }
  };

  const calculateNights = () => {
    if (checkInDate && checkOutDate) {
      const start = new Date(checkInDate);
      const end = new Date(checkOutDate);
      const diffTime = Math.abs(end - start);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 0;
  };

  const nights = calculateNights();

  const toggleService = (service) => {
    const existing = selectedServices.find(s => s.id === service.id);
    
    if (existing) {
      setSelectedServices(selectedServices.filter(s => s.id !== service.id));
    } else {
      setSelectedServices([
        ...selectedServices,
        { ...service, quantity: service.unit === 'per_person' ? guests : 1 }
      ]);
    }
  };

  const updateQuantity = (serviceId, newQuantity) => {
    if (newQuantity < 1) return;
    
    setSelectedServices(
      selectedServices.map(s =>
        s.id === serviceId ? { ...s, quantity: newQuantity } : s
      )
    );
  };

  const calculateServiceTotal = (service) => {
    const selectedService = selectedServices.find(s => s.id === service.id);
    if (!selectedService) return 0;

    const quantity = selectedService.quantity;

    switch (service.unit) {
      case 'per_person':
        return service.price * quantity * nights;
      case 'per_night':
        return service.price * nights;
      case 'per_room':
        return service.price * quantity;
      case 'per_unit':
        return service.price * quantity;
      default:
        return service.price;
    }
  };

  const getTotalServices = () => {
    return selectedServices.reduce((sum, service) => {
      return sum + calculateServiceTotal(service);
    }, 0);
  };

  const getServiceUnitLabel = (unit) => {
    switch (unit) {
      case 'per_person':
        return '/persona/noche';
      case 'per_night':
        return '/noche';
      case 'per_room':
        return '/habitación';
      case 'per_unit':
        return '/unidad';
      default:
        return '';
    }
  };

  const handleContinue = () => {
    onUpdate({ selectedServices });
    onNext();
  };

  if (loading) {
    return <div className="text-center py-8">Cargando servicios...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Servicios Adicionales
        </h2>
        <p className="text-muted-foreground">
          Seleccione servicios opcionales para complementar su estadía (opcional)
        </p>
      </div>

      {/* Lista de Servicios */}
      <div className="space-y-3">
        {services.map((service) => {
          const isSelected = selectedServices.find(s => s.id === service.id);
          const selectedService = selectedServices.find(s => s.id === service.id);
          
          return (
            <Card
              key={service.id}
              className={`cursor-pointer transition-all ${
                isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
              }`}
              onClick={() => service.unit !== 'per_unit' && toggleService(service)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`mt-1 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                      {isSelected ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-current" />
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div>
                        <p className="font-semibold text-foreground">{service.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ${service.price.toLocaleString()}{getServiceUnitLabel(service.unit)}
                        </p>
                      </div>

                      {/* Quantity Input para servicios per_unit */}
                      {isSelected && service.unit === 'per_unit' && (
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Cantidad:</Label>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(service.id, selectedService.quantity - 1);
                              }}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={selectedService.quantity}
                              onChange={(e) => {
                                e.stopPropagation();
                                updateQuantity(service.id, parseInt(e.target.value) || 1);
                              }}
                              className="w-20 text-center"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(service.id, selectedService.quantity + 1);
                              }}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {isSelected && (
                        <p className="text-sm font-semibold text-primary">
                          Subtotal: ${calculateServiceTotal(service).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Resumen */}
      {selectedServices.length > 0 && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <h4 className="font-semibold text-foreground mb-3">Resumen de Servicios</h4>
            <div className="space-y-2 text-sm">
              {selectedServices.map((service) => (
                <div key={service.id} className="flex justify-between">
                  <span className="text-muted-foreground">{service.name}</span>
                  <span className="font-semibold">
                    ${calculateServiceTotal(service).toLocaleString()}
                  </span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between text-base">
                <span className="font-semibold">Subtotal servicios:</span>
                <span className="font-bold text-primary">
                  ${getTotalServices().toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Volver
        </Button>
        <Button onClick={handleContinue}>
          {selectedServices.length > 0 ? 'Continuar' : 'Omitir Servicios'}
        </Button>
      </div>
    </div>
  );
};

export default Step3AdditionalServices;