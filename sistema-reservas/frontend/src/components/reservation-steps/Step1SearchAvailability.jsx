import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Calendar } from '@/components/ui/Calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { CalendarIcon, Search } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { reservationsService } from '@/services/reservations';
import { fetchRoomTypes } from '@/services/rooms';

const Step1SearchAvailability = ({ data, onUpdate, onNext }) => {
  const [checkInDate, setCheckInDate] = useState(data.checkInDate ? new Date(data.checkInDate) : null);
  const [checkOutDate, setCheckOutDate] = useState(data.checkOutDate ? new Date(data.checkOutDate) : null);
  const [guests, setGuests] = useState(data.guests || 1);
  const [roomTypes, setRoomTypes] = useState([]);
  const [selectedRoomType, setSelectedRoomType] = useState(data.filters?.roomTypeId || 'all');
  const [selectedFloor, setSelectedFloor] = useState(data.filters?.floor || 'all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRoomTypes();
  }, []);

  const loadRoomTypes = async () => {
    try {
      const types = await fetchRoomTypes();
      setRoomTypes(types);
    } catch (error) {
      console.error('Error al cargar tipos de habitación:', error);
      toast.error('Error al cargar tipos de habitación');
    }
  };

  const handleSearch = async () => {
    if (!checkInDate || !checkOutDate) {
      toast.error('Debe seleccionar fechas de check-in y check-out');
      return;
    }

    if (checkInDate >= checkOutDate) {
      toast.error('La fecha de check-out debe ser posterior al check-in');
      return;
    }

    if (guests < 1) {
      toast.error('Debe ingresar al menos 1 huésped');
      return;
    }

    setLoading(true);

    try {
      const filters = {};
      if (selectedRoomType && selectedRoomType !== 'all') {
        filters.roomTypeId = selectedRoomType;
      }
      if (selectedFloor && selectedFloor !== 'all') {
        filters.floor = selectedFloor;
      }

      const result = await reservationsService.searchAvailability(
        format(checkInDate, 'yyyy-MM-dd'),
        format(checkOutDate, 'yyyy-MM-dd'),
        guests,
        filters
      );

      if (result.availableRooms.length === 0) {
        toast.warning('No hay habitaciones disponibles para las fechas seleccionadas');
        return;
      }

      // Actualizar datos y avanzar
      onUpdate({
        checkInDate: format(checkInDate, 'yyyy-MM-dd'),
        checkOutDate: format(checkOutDate, 'yyyy-MM-dd'),
        guests,
        filters,
        availableRooms: result.availableRooms,
        activeSeason: result.activeSeason,
        suggestions: result.suggestions,
      });

      toast.success(`${result.availableRooms.length} habitaciones disponibles`);
      onNext();
    } catch (error) {
      console.error('Error al buscar disponibilidad:', error);
      toast.error(error.response?.data?.message || 'Error al buscar disponibilidad');
    } finally {
      setLoading(false);
    }
  };

  const calculateNights = () => {
    if (checkInDate && checkOutDate) {
      const diffTime = Math.abs(checkOutDate - checkInDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 0;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Búsqueda de Disponibilidad
        </h2>
        <p className="text-muted-foreground">
          Ingrese las fechas y número de huéspedes para buscar habitaciones disponibles
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Check-in Date */}
        <div className="space-y-2">
          <Label htmlFor="checkIn">Fecha de Check-in *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {checkInDate ? format(checkInDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={checkInDate}
                onSelect={setCheckInDate}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return date < today;
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Check-out Date */}
        <div className="space-y-2">
          <Label htmlFor="checkOut">Fecha de Check-out *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {checkOutDate ? format(checkOutDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={checkOutDate}
                onSelect={setCheckOutDate}
                disabled={(date) => date <= (checkInDate || new Date())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Guests */}
      <div className="space-y-2">
        <Label htmlFor="guests">Número de Huéspedes *</Label>
        <Input
          id="guests"
          type="text"
          value={guests}
          onChange={(e) => {
            const value = e.target.value;
            if (/^\d*$/.test(value)) {
              const num = parseInt(value) || '';
              if (num === '' || (num >= 1 && num <= 10)) {
                setGuests(num || 1);
              }
            }
          }}
          onFocus={(e) => e.target.select()}
          placeholder="Número de huéspedes (1-10)"
          className="text-center"
        />
      </div>

      {/* Nights Display */}
      {checkInDate && checkOutDate && (
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{calculateNights()}</span> noches
            {' - '}
            {format(checkInDate, 'dd/MM/yyyy')} al {format(checkOutDate, 'dd/MM/yyyy')}
          </p>
        </div>
      )}

      {/* Optional Filters */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Filtros Opcionales
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Room Type Filter */}
          <div className="space-y-2">
            <Label>Tipo de Habitación</Label>
            <Select value={selectedRoomType} onValueChange={setSelectedRoomType}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {roomTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id.toString()}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Floor Filter */}
          <div className="space-y-2">
            <Label>Piso Preferido</Label>
            <Select value={selectedFloor} onValueChange={setSelectedFloor}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los pisos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los pisos</SelectItem>
                <SelectItem value="1">Piso 1</SelectItem>
                <SelectItem value="2">Piso 2</SelectItem>
                <SelectItem value="3">Piso 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Search Button */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSearch}
          disabled={!checkInDate || !checkOutDate || guests < 1 || loading}
          size="lg"
        >
          <Search className="mr-2 h-4 w-4" />
          {loading ? 'Buscando...' : 'Buscar Habitaciones'}
        </Button>
      </div>
    </div>
  );
};

export default Step1SearchAvailability;