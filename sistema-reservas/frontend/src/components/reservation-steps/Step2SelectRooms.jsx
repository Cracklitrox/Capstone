import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { CheckCircle2, Users, DollarSign, Bed } from 'lucide-react';
import { toast } from 'sonner';

const Step2SelectRooms = ({ data, onUpdate, onNext, onBack }) => {
  const [selectedRooms, setSelectedRooms] = useState(data.selectedRooms || []);
  const { availableRooms, activeSeason, suggestions, guests, checkInDate, checkOutDate } = data;

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

  const toggleRoomSelection = (room) => {
    const isSelected = selectedRooms.find(r => r.id === room.id);
    
    if (isSelected) {
      setSelectedRooms(selectedRooms.filter(r => r.id !== room.id));
    } else {
      setSelectedRooms([...selectedRooms, room]);
    }
  };

  const selectSuggestion = (suggestion) => {
    setSelectedRooms(suggestion.rooms);
    toast.success('Sugerencia aplicada');
  };

  const getTotalCapacity = () => {
    return selectedRooms.reduce((sum, room) => sum + room.capacity, 0);
  };

  const getTotalPrice = () => {
    return selectedRooms.reduce((sum, room) => sum + (room.pricePerNight * nights), 0);
  };

  const handleContinue = () => {
    if (selectedRooms.length === 0) {
      toast.error('Debe seleccionar al menos una habitación');
      return;
    }

    const totalCapacity = getTotalCapacity();
    if (totalCapacity < guests) {
      toast.error(`Capacidad insuficiente: ${totalCapacity}/${guests} personas`);
      return;
    }

    onUpdate({ selectedRooms });
    onNext();
  };

  // Agrupar habitaciones por piso
  const roomsByFloor = availableRooms.reduce((acc, room) => {
    const floor = room.floor || 0;
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(room);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Selección de Habitaciones
        </h2>
        <p className="text-muted-foreground">
          Seleccione las habitaciones para {guests} huéspedes ({nights} noches)
        </p>
      </div>

      {/* Temporada Activa */}
      {activeSeason && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">✨ {activeSeason.name}</p>
                <p className="text-sm text-muted-foreground">
                  +${activeSeason.modifier.toLocaleString()} sobre tarifa base
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sugerencias Automáticas */}
      {suggestions && suggestions.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">Sugerencias Automáticas</h3>
          {suggestions.map((suggestion) => (
            <Card
              key={suggestion.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => selectSuggestion(suggestion)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="font-semibold text-foreground">{suggestion.name}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {suggestion.totalCapacity} personas
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        ${suggestion.pricePerNight.toLocaleString()}/noche
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-primary">
                      Total {nights} noches: ${suggestion.totalPrice.toLocaleString()}
                    </p>
                  </div>
                  <Button size="sm">Seleccionar</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Separator />

      {/* Selección Manual por Piso */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">O Seleccione Manualmente</h3>
        
        {Object.keys(roomsByFloor).sort().map((floor) => (
          <div key={floor} className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              📍 Piso {floor}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {roomsByFloor[floor].map((room) => {
                const isSelected = selectedRooms.find(r => r.id === room.id);
                
                return (
                  <Card
                    key={room.id}
                    className={`cursor-pointer transition-all ${
                      isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                    }`}
                    onClick={() => toggleRoomSelection(room)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-lg">{room.number}</p>
                            {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                          </div>
                          <p className="text-sm text-muted-foreground">{room.type}</p>
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4" />
                            <span>{room.capacity}p</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">
                            ${room.pricePerNight.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">/noche</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Resumen de Selección */}
      {selectedRooms.length > 0 && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <h4 className="font-semibold text-foreground mb-3">Resumen de Selección</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Habitaciones seleccionadas:</span>
                <span className="font-semibold">{selectedRooms.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Capacidad total:</span>
                <span className={`font-semibold ${
                  getTotalCapacity() >= guests ? 'text-green-600' : 'text-destructive'
                }`}>
                  {getTotalCapacity()}/{guests} personas {getTotalCapacity() >= guests && '✓'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-base">
                <span className="font-semibold">Subtotal ({nights} noches):</span>
                <span className="font-bold text-primary">
                  ${getTotalPrice().toLocaleString()}
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
        <Button
          onClick={handleContinue}
          disabled={selectedRooms.length === 0 || getTotalCapacity() < guests}
        >
          Continuar
        </Button>
      </div>
    </div>
  );
};

export default Step2SelectRooms;