import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { CalendarClock, User, Home, Phone, Mail, Bed } from 'lucide-react';

/**
 * Componente de tarjeta mejorado para alertas de checkout
 * Maneja huéspedes con múltiples habitaciones
 * 
 * @param {Object} alert - Objeto de alerta con información del checkout
 * @param {string} variant - Tipo de alerta: 'today', 'past', 'future'
 */
export default function CheckoutAlertCard({ alert, variant = 'today' }) {
  const { guestInfo, rooms, roomCount, checkOutDate, checkOutTime, status, reservationCode } = alert;

  // Colores según el estado
  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'confirmed':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Color del borde de la tarjeta según el tipo
  const getVariantColor = () => {
    switch (variant) {
      case 'today':
        return 'border-l-4 border-l-orange-500';
      case 'past':
        return 'border-l-4 border-l-gray-400';
      case 'future':
        return 'border-l-4 border-l-blue-400';
      default:
        return 'border-l-4 border-l-orange-500';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-CL', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'in_progress':
        return 'En Progreso';
      case 'confirmed':
        return 'Confirmado';
      case 'pending':
        return 'Pendiente';
      default:
        return status;
    }
  };

  return (
    <Card className={`hover:shadow-lg transition-shadow ${getVariantColor()}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{guestInfo.fullName}</CardTitle>
          </div>
          <Badge className={getStatusColor()}>{getStatusText()}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Código: {reservationCode}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Fecha y hora de checkout */}
        <div className="flex items-center gap-2 text-sm">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{formatDate(checkOutDate)}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-orange-600 font-semibold">{checkOutTime}</span>
        </div>

        {/* Información de contacto */}
        <div className="space-y-1">
          {guestInfo.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{guestInfo.email}</span>
            </div>
          )}
          {guestInfo.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span>{guestInfo.phone}</span>
            </div>
          )}
        </div>

        {/* Habitaciones */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">
              {roomCount === 1 ? 'Habitación' : `${roomCount} Habitaciones`}
            </span>
          </div>

          <div className="space-y-2">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between p-2 bg-muted rounded-md"
              >
                <div className="flex items-center gap-2">
                  <Bed className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Habitación {room.number}</p>
                    <p className="text-xs text-muted-foreground">
                      {room.type} • Piso {room.floor}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {room.status === 'available'
                    ? 'Disponible'
                    : room.status === 'occupied'
                      ? 'Ocupada'
                      : room.status === 'cleaning'
                        ? 'Limpieza'
                        : room.status === 'maintenance'
                          ? 'Mantenimiento'
                          : room.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
