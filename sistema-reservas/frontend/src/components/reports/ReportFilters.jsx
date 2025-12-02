import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { Calendar } from '../ui/Calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/Popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

/**
 * Componente reutilizable de filtros para reportes
 * @param {Object} props
 * @param {Object} props.dateRange - Rango de fechas { from: Date, to: Date }
 * @param {Function} props.onDateRangeChange - Callback para cambio de fechas
 * @param {Array} props.visibleFilters - Array de strings con nombres de filtros a mostrar
 *   Opciones: 'quickPeriod', 'floor', 'roomType', 'room', 'country', 'ageRange', 'ageCustom', 'spendingRange'
 * @param {Object} props.filterValues - Valores actuales de los filtros
 * @param {Function} props.onFilterChange - Callback para cambio de filtros
 * @param {Array} props.options - Opciones para los selectores (floors, roomTypes, rooms, countries, etc.)
 */
const ReportFilters = ({
  dateRange,
  onDateRangeChange,
  visibleFilters = [],
  filterValues = {},
  onFilterChange,
  options = {}
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Períodos rápidos predefinidos
  const quickPeriods = [
    { value: '7days', label: '7 días', days: 7 },
    { value: '14days', label: '14 días', days: 14 },
    { value: '30days', label: '30 días', days: 30 },
    { value: 'trimester', label: 'Trimestre', days: 90 },
    { value: 'annual', label: 'Anual', days: 365 }
  ];

  // Rangos de edad predefinidos
  const AGE_RANGES = [
    { value: '4-17', label: '4-17 años' },
    { value: '18-25', label: '18-25 años' },
    { value: '26-35', label: '26-35 años' },
    { value: '36-45', label: '36-45 años' },
    { value: '46-60', label: '46-60 años' },
    { value: 'Mayor de 60', label: 'Mayor de 60 años' },
  ];

  // Rangos de gasto predefinidos
  const SPENDING_RANGES = [
    { value: 'Menos de $50.000', label: 'Menos de $50.000' },
    { value: '$50.000 - $99.999', label: '$50.000 - $99.999' },
    { value: '$100.000 - $199.999', label: '$100.000 - $199.999' },
    { value: '$200.000 - $499.999', label: '$200.000 - $499.999' },
    { value: '$500.000 o más', label: '$500.000 o más' },
  ];

  // Estados de reserva
  const RESERVATION_STATUSES = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'confirmed', label: 'Confirmada' },
    { value: 'ready_for_checkin', label: 'Lista para Check-in' },
    { value: 'in_progress', label: 'En Progreso' },
    { value: 'pending_checkout', label: 'Pendiente de Checkout' },
    { value: 'completed', label: 'Completada' },
    { value: 'canceled', label: 'Cancelada' },
    { value: 'no_show', label: 'No Show' }
  ];

  // Métodos de pago
  const PAYMENT_METHODS = [
    { value: 'cash', label: 'Efectivo' },
    { value: 'bank_transfer', label: 'Transferencia Bancaria' },
    { value: 'credit_card', label: 'Tarjeta de Crédito' },
    { value: 'debit_card', label: 'Tarjeta de Débito' },
    { value: 'multiple', label: 'Múltiple' }
  ];

  // Manejar cambio de período rápido
  const handleQuickPeriodChange = (periodValue, days) => {
    // Usar AYER como fecha final (no HOY) para coincidir con la lógica del dashboard
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const start = new Date(yesterday);
    start.setDate(yesterday.getDate() - (days - 1)); // -1 porque ya incluye ayer

    onDateRangeChange({ from: start, to: yesterday });
    onFilterChange?.('quickPeriod', periodValue);
  };

  // Limpiar un filtro específico
  const clearFilter = (filterName) => {
    onFilterChange?.(filterName, null);
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Período Rápido */}
          {visibleFilters.includes('quickPeriod') && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Período Rápido</Label>
              <div className="flex flex-wrap gap-2">
                {quickPeriods.map((period) => (
                  <Button
                    key={period.value}
                    variant={filterValues.quickPeriod === period.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleQuickPeriodChange(period.value, period.days)}
                    className="text-xs"
                  >
                    {period.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Rango de Fechas Personalizado */}
          {visibleFilters.includes('dateRange') && (
            <div className="grid grid-cols-2 gap-4">
              {/* Fecha Desde */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Desde</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange?.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        format(dateRange.from, "dd/MM/yyyy", { locale: es })
                      ) : (
                        <span>Seleccionar fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange?.from}
                      onSelect={(date) => {
                        if (date) {
                          onDateRangeChange({ ...dateRange, from: date });
                          onFilterChange?.('quickPeriod', null);
                        }
                      }}
                      initialFocus
                      captionLayout="dropdown"
                      fromYear={2020}
                      toYear={new Date().getFullYear()}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Fecha Hasta */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Hasta</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange?.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.to ? (
                        format(dateRange.to, "dd/MM/yyyy", { locale: es })
                      ) : (
                        <span>Seleccionar fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange?.to}
                      onSelect={(date) => {
                        if (date) {
                          onDateRangeChange({ ...dateRange, to: date });
                          onFilterChange?.('quickPeriod', null);
                        }
                      }}
                      initialFocus
                      captionLayout="dropdown"
                      fromYear={2020}
                      toYear={new Date().getFullYear()}
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Filtro por Piso */}
          {visibleFilters.includes('floor') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Filtrar por Piso</Label>
                {filterValues.floor !== null && filterValues.floor !== undefined && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearFilter('floor')}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>
              <select
                value={filterValues.floor ?? ''}
                onChange={(e) => onFilterChange?.('floor', e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="">Todos los Pisos</option>
                {(options.floors || []).map((floor) => (
                  <option key={floor} value={floor}>
                    Piso {floor}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro por Tipo de Habitación */}
          {visibleFilters.includes('roomType') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Tipo de Habitación</Label>
                {filterValues.roomType && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearFilter('roomType')}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>
              <select
                value={filterValues.roomType || ''}
                onChange={(e) => onFilterChange?.('roomType', e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="">Todos los Tipos</option>
                {(options.roomTypes || []).map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro por Habitación */}
          {visibleFilters.includes('room') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Habitación Específica</Label>
                {filterValues.room && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearFilter('room')}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>
              <select
                value={filterValues.room || ''}
                onChange={(e) => onFilterChange?.('room', e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="">Todas las Habitaciones</option>
                {(options.rooms || []).map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.roomNumber} - {room.type}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro por País */}
          {visibleFilters.includes('country') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">País</Label>
                {filterValues.country && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearFilter('country')}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>
              <select
                value={filterValues.country || ''}
                onChange={(e) => onFilterChange?.('country', e.target.value || null)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="">Todos los Países</option>
                {(options.countries || []).map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro por Rango de Edad Predefinido */}
          {visibleFilters.includes('ageRange') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Rango de Edad</Label>
                {filterValues.ageRange && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearFilter('ageRange')}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>
              <select
                value={filterValues.ageRange || ''}
                onChange={(e) => onFilterChange?.('ageRange', e.target.value || null)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="">Todos los Rangos</option>
                {AGE_RANGES.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro por Edad Personalizada */}
          {visibleFilters.includes('ageCustom') && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Rango de Edad Personalizado</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Edad Mínima</Label>
                  <input
                    type="number"
                    min="4"
                    max="120"
                    value={filterValues.minAge || ''}
                    onChange={(e) => onFilterChange?.('minAge', e.target.value)}
                    placeholder="Ej: 18"
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  />
                  {filterValues.minAge && parseInt(filterValues.minAge) < 4 && (
                    <p className="text-xs text-red-500 mt-1">La edad mínima debe ser 4 años</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Edad Máxima</Label>
                  <input
                    type="number"
                    min="4"
                    max="120"
                    value={filterValues.maxAge || ''}
                    onChange={(e) => onFilterChange?.('maxAge', e.target.value)}
                    placeholder="Ej: 65"
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  />
                  {filterValues.maxAge && filterValues.minAge &&
                    parseInt(filterValues.maxAge) < parseInt(filterValues.minAge) && (
                      <p className="text-xs text-red-500 mt-1">Debe ser mayor que la edad mínima</p>
                    )}
                </div>
              </div>
              {(filterValues.minAge || filterValues.maxAge) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clearFilter('minAge');
                    clearFilter('maxAge');
                  }}
                  className="mt-2 h-6 px-2 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpiar edades personalizadas
                </Button>
              )}
            </div>
          )}

          {/* Filtro por Rango de Gasto */}
          {visibleFilters.includes('spendingRange') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Rango de Gasto</Label>
                {filterValues.spendingRange && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearFilter('spendingRange')}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>
              <select
                value={filterValues.spendingRange || ''}
                onChange={(e) => onFilterChange?.('spendingRange', e.target.value || null)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="">Todos los Rangos</option>
                {SPENDING_RANGES.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro por Estado de Reserva */}
          {visibleFilters.includes('reservationStatus') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Estado de Reserva</Label>
                {filterValues.reservationStatus && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearFilter('reservationStatus')}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>
              <select
                value={filterValues.reservationStatus || ''}
                onChange={(e) => onFilterChange?.('reservationStatus', e.target.value || null)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="">Todos los Estados</option>
                {RESERVATION_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro por Método de Pago */}
          {visibleFilters.includes('paymentMethod') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Método de Pago</Label>
                {filterValues.paymentMethod && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearFilter('paymentMethod')}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>
              <select
                value={filterValues.paymentMethod || ''}
                onChange={(e) => onFilterChange?.('paymentMethod', e.target.value || null)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="">Todos los Métodos</option>
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtro por Rango de Monto Personalizado */}
          {visibleFilters.includes('amountRange') && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Rango de Monto Personalizado</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Monto Mínimo</Label>
                  <input
                    type="number"
                    min="0"
                    value={filterValues.minAmount || ''}
                    onChange={(e) => onFilterChange?.('minAmount', e.target.value)}
                    placeholder="Ej: 50000"
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Monto Máximo</Label>
                  <input
                    type="number"
                    min="0"
                    value={filterValues.maxAmount || ''}
                    onChange={(e) => onFilterChange?.('maxAmount', e.target.value)}
                    placeholder="Ej: 200000"
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  />
                  {filterValues.maxAmount && filterValues.minAmount &&
                    parseInt(filterValues.maxAmount) < parseInt(filterValues.minAmount) && (
                      <p className="text-xs text-red-500 mt-1">Debe ser mayor que el monto mínimo</p>
                    )}
                </div>
              </div>
              {(filterValues.minAmount || filterValues.maxAmount) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clearFilter('minAmount');
                    clearFilter('maxAmount');
                  }}
                  className="mt-2 h-6 px-2 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpiar montos personalizados
                </Button>
              )}
            </div>
          )}

          {/* Filtro por Huésped (búsqueda) */}
          {visibleFilters.includes('guest') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Buscar Huésped</Label>
                {filterValues.guest && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearFilter('guest')}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>
              <input
                type="text"
                value={filterValues.guest || ''}
                onChange={(e) => onFilterChange?.('guest', e.target.value || null)}
                placeholder="Nombre, email o RUT"
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportFilters;
