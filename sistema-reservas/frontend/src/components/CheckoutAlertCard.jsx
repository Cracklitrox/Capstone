import React from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  UserIcon,
  ClockIcon,
  HomeIcon,
  PhoneIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";

/**
 * Componente de tarjeta individual para mostrar una alerta de check-out
 * @param {Object} alert - Datos de la alerta
 * @param {Function} onRoomClick - Función a ejecutar al hacer click en la habitación
 */
function CheckoutAlertCard({ alert, onRoomClick }) {
  const { reservationCode, checkOutTime, guestInfo, roomInfo, guestCount } = alert;

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-orange-500">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <HomeIcon className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">
                Habitación {roomInfo.number}
              </h3>
              <Badge variant="warning" className="ml-2">
                Check-out {checkOutTime}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {roomInfo.type} • Piso {roomInfo.floor}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-1">Reserva</p>
            <p className="text-sm font-semibold text-foreground">{reservationCode}</p>
          </div>
        </div>

        <div className="space-y-2 border-t pt-3">
          {/* Información del Huésped */}
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {guestInfo.fullName}
              </p>
              <p className="text-xs text-muted-foreground">
                {guestCount} {guestCount === 1 ? 'huésped' : 'huéspedes'}
              </p>
            </div>
          </div>

          {/* Email */}
          {guestInfo.email && (
            <div className="flex items-center gap-2">
              <EnvelopeIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-muted-foreground truncate">
                {guestInfo.email}
              </p>
            </div>
          )}

          {/* Teléfono */}
          {guestInfo.phone && (
            <div className="flex items-center gap-2">
              <PhoneIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                {guestInfo.phone}
              </p>
            </div>
          )}

          {/* Hora de Check-out */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <ClockIcon className="h-4 w-4 text-orange-500 flex-shrink-0" />
            <p className="text-sm font-medium text-orange-600">
              Check-out programado: {checkOutTime}
            </p>
          </div>
        </div>

        {/* Botón de acción (opcional) */}
        {onRoomClick && (
          <button
            onClick={() => onRoomClick(roomInfo.id)}
            className="mt-3 w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Ver Detalles de Habitación
          </button>
        )}
      </CardContent>
    </Card>
  );
}

export default CheckoutAlertCard;
