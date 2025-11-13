import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Separator } from '@/components/ui/Separator';
import { Home, Receipt, AlertCircle, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { reservationsService } from '@/services/reservations';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const Step3AdditionalServices = ({ data, onUpdate, onNext, onBack }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado de asignaciones por habitación
  const [roomServiceAssignments, setRoomServiceAssignments] = useState([]);

  useEffect(() => {
    loadServices();
    initializeAssignments();
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

  const initializeAssignments = () => {
    // Si ya hay asignaciones previas, usarlas
    if (data.roomServiceAssignments && data.roomServiceAssignments.length > 0) {
      setRoomServiceAssignments(data.roomServiceAssignments);
    }
  };

  // Generar fechas de estadía
  const getServiceDates = () => {
    const dates = [];
    const start = new Date(data.checkInDate);
    const end = new Date(data.checkOutDate);

    let current = new Date(start);
    while (current < end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const serviceDates = getServiceDates();

  // Obtener número de huéspedes en una habitación
  const getGuestCountInRoom = (roomId) => {
    const assignment = data.roomGuestAssignments.find(a => a.roomId === roomId);
    return assignment?.guestIds.length || 0;
  };

  // Agregar servicio a habitación
  const addServiceToRoom = (roomId, serviceId) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    // Verificar si ya existe
    const exists = roomServiceAssignments.find(
      rsa => rsa.roomId === roomId && rsa.serviceId === serviceId
    );

    if (exists) {
      toast.error('Este servicio ya está asignado a esta habitación');
      return;
    }

    // Calcular cantidad automática según tipo de servicio
    const guestCount = getGuestCountInRoom(roomId);
    let quantity;

    if (service.unit === 'per_person') {
      quantity = guestCount; // Cantidad = huéspedes
    } else if (service.unit === 'per_room') {
      quantity = 1; // Cantidad = 1
    } else {
      quantity = 1; // Default
    }

    // Crear nueva asignación con TODAS las fechas por defecto
    const newAssignment = {
      roomId,
      serviceId,
      serviceName: service.name,
      serviceUnit: service.unit,
      unitPrice: service.price,
      quantity,
      dates: [...serviceDates], // Todas las fechas por defecto
    };

    setRoomServiceAssignments(prev => [...prev, newAssignment]);
    toast.success(`${service.name} agregado a la habitación`);
  };

  // Remover servicio de habitación
  const removeServiceFromRoom = (roomId, serviceId) => {
    setRoomServiceAssignments(prev =>
      prev.filter(rsa => !(rsa.roomId === roomId && rsa.serviceId === serviceId))
    );
    toast.info('Servicio eliminado');
  };

  // Actualizar cantidad de servicio
  const updateQuantity = (roomId, serviceId, newQuantity) => {
    const quantity = parseInt(newQuantity) || 1;
    setRoomServiceAssignments(prev =>
      prev.map(rsa => {
        if (rsa.roomId === roomId && rsa.serviceId === serviceId) {
          return { ...rsa, quantity };
        }
        return rsa;
      })
    );
  };

  // ✅ Actualizar precio unitario de un servicio
  const updateUnitPrice = (roomId, serviceId, newPrice) => {
    const price = parseInt(newPrice) || 0;
    setRoomServiceAssignments(prev =>
      prev.map(rsa => {
        if (rsa.roomId === roomId && rsa.serviceId === serviceId) {
          return { ...rsa, unitPrice: price };
        }
        return rsa;
      })
    );
  };

  // Toggle fecha de servicio
  const toggleDate = (roomId, serviceId, date) => {
    setRoomServiceAssignments(prev =>
      prev.map(rsa => {
        if (rsa.roomId === roomId && rsa.serviceId === serviceId) {
          const dates = rsa.dates.includes(date)
            ? rsa.dates.filter(d => d !== date)
            : [...rsa.dates, date];
          return { ...rsa, dates };
        }
        return rsa;
      })
    );
  };

  // Obtener servicios disponibles para una habitación (los que NO están asignados)
  const getAvailableServicesForRoom = (roomId) => {
    const assignedServiceIds = roomServiceAssignments
      .filter(rsa => rsa.roomId === roomId)
      .map(rsa => rsa.serviceId);

    return services.filter(s => !assignedServiceIds.includes(s.id));
  };

  // Obtener servicios asignados a una habitación
  const getAssignedServicesForRoom = (roomId) => {
    return roomServiceAssignments.filter(rsa => rsa.roomId === roomId);
  };

  // Continuar al siguiente paso
  const handleNext = () => {
    // Filtrar servicios sin fechas
    const validAssignments = roomServiceAssignments.filter(rsa => rsa.dates.length > 0);

    if (validAssignments.length < roomServiceAssignments.length) {
      const removed = roomServiceAssignments.length - validAssignments.length;
      toast.warning(`Se eliminaron ${removed} servicio(s) sin fechas asignadas`);
    }

    // Guardar asignaciones
    onUpdate({ roomServiceAssignments: validAssignments });
    onNext();
  };

  // Calcular total estimado
  const calculateTotal = () => {
    return roomServiceAssignments.reduce((sum, rsa) => {
      return sum + (rsa.unitPrice * rsa.quantity * rsa.dates.length);
    }, 0);
  };

  if (loading) {
    return <div className="text-center py-8">Cargando servicios...</div>;
  }

  // ✅ Contar solo habitaciones con huéspedes
  const roomsWithGuests = data.selectedRooms.filter(room =>
    data.roomGuestAssignments?.some(a => a.roomId === room.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Servicios Adicionales</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Asigne servicios a cada habitación según las necesidades de los huéspedes
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Distribuyendo servicios en {roomsWithGuests.length} habitación(es) con huéspedes asignados
        </p>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-medium">¿Cómo funciona?</p>
          <p className="mt-1">
            Los servicios se asignan por habitación. La cantidad se ajusta automáticamente:
            • <strong>Per Person</strong> (ej: desayuno) = número de huéspedes
            • <strong>Per Room</strong> (ej: limpieza) = 1
          </p>
        </div>
      </div>

      {/* Habitaciones con servicios */}
      <div className="space-y-4">
        {/* ✅ Solo mostrar habitaciones con huéspedes asignados */}
        {data.selectedRooms
          .filter(room => {
            // Filtrar solo habitaciones que tienen huéspedes
            const hasGuests = data.roomGuestAssignments?.some(a => a.roomId === room.id);
            return hasGuests;
          })
          .map(room => {
            const assignedServices = getAssignedServicesForRoom(room.id);
            const availableServices = getAvailableServicesForRoom(room.id);
            const guestCount = getGuestCountInRoom(room.id);

          return (
            <Card key={room.id}>
              <CardContent className="pt-6 space-y-4">
                {/* Header de habitación */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Habitación {room.number} - {room.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {guestCount} huésped(es) · {assignedServices.length} servicio(s)
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Servicios asignados */}
                {assignedServices.length > 0 && (
                  <div className="space-y-3">
                    {assignedServices.map(rsa => (
                      <div key={`${rsa.roomId}-${rsa.serviceId}`} className="border rounded-lg p-4 space-y-3">
                        {/* Encabezado del servicio */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{rsa.serviceName}</span>
                            <Badge variant="secondary">{rsa.serviceUnit}</Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeServiceFromRoom(room.id, rsa.serviceId)}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* ✅ Precio - Solo editable para servicios custom */}
                        <div className="flex items-center gap-3">
                          <Label className="text-sm">Precio unitario:</Label>
                          {rsa.serviceUnit === 'custom' ? (
                            <>
                              <Input
                                type="number"
                                min="0"
                                step="100"
                                value={rsa.unitPrice}
                                onChange={(e) => updateUnitPrice(room.id, rsa.serviceId, e.target.value)}
                                className="w-32 h-9"
                              />
                              <span className="text-sm text-muted-foreground">CLP</span>
                            </>
                          ) : (
                            <Badge variant="outline" className="text-sm px-3 py-1">
                              ${rsa.unitPrice.toLocaleString()} CLP
                            </Badge>
                          )}
                        </div>

                        {/* Cantidad */}
                        <div className="flex items-center gap-3">
                          <Label className="text-sm">Cantidad por día:</Label>
                          <Input
                            type="number"
                            min="1"
                            value={rsa.quantity}
                            onChange={(e) => updateQuantity(room.id, rsa.serviceId, e.target.value)}
                            className="w-24 h-9"
                          />
                          {rsa.serviceUnit === 'per_person' && (
                            <span className="text-xs text-muted-foreground">
                              (Auto: {guestCount} huésped{guestCount > 1 ? 'es' : ''})
                            </span>
                          )}
                        </div>

                        {/* Fechas */}
                        <div className="space-y-2">
                          <Label className="text-sm">Fechas:</Label>
                          <div className="grid grid-cols-3 gap-2">
                            {serviceDates.map(date => {
                              const isSelected = rsa.dates.includes(date);
                              const dateObj = new Date(date + 'T12:00:00');
                              const formattedDate = format(dateObj, 'EEE d MMM', { locale: es });

                              return (
                                <div
                                  key={date}
                                  className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50 cursor-pointer"
                                  onClick={() => toggleDate(room.id, rsa.serviceId, date)}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleDate(room.id, rsa.serviceId, date)}
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

                        {/* Subtotal del servicio */}
                        <div className="flex justify-end pt-2 border-t">
                          <p className="text-sm font-medium">
                            Subtotal: ${(rsa.unitPrice * rsa.quantity * rsa.dates.length).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Agregar servicio */}
                {availableServices.length > 0 && (
                  <div>
                    <select
                      className="w-full p-2 border rounded-md text-sm"
                      onChange={(e) => {
                        if (e.target.value) {
                          addServiceToRoom(room.id, parseInt(e.target.value));
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>+ Agregar servicio</option>
                      {availableServices.map(service => (
                        <option key={service.id} value={service.id}>
                          {service.name} - ${service.price.toLocaleString()} ({service.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {assignedServices.length === 0 && (
                  <div className="text-center py-4 text-sm text-muted-foreground border-2 border-dashed rounded-md">
                    No hay servicios asignados
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* ✅ Mensaje si no hay habitaciones con huéspedes */}
        {data.selectedRooms.filter(room =>
          data.roomGuestAssignments?.some(a => a.roomId === room.id)
        ).length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto text-orange-500 mb-3" />
                <p className="text-lg font-medium text-muted-foreground">
                  No hay habitaciones con huéspedes asignados
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Debe asignar huéspedes a las habitaciones en el paso anterior
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Total estimado */}
      {roomServiceAssignments.length > 0 && (
        <Card className="bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="font-medium">Total Estimado de Servicios:</span>
              <span className="text-2xl font-bold">${calculateTotal().toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Volver
        </Button>
        <Button onClick={handleNext}>
          {roomServiceAssignments.length > 0 ? 'Continuar' : 'Saltar servicios'}
        </Button>
      </div>
    </div>
  );
};

export default Step3AdditionalServices;
