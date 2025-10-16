import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Separator } from "@/components/ui/Separator";

const statusLabels = {
  pending: { label: "Pendiente", variant: "warning" },
  confirmed: { label: "Confirmada", variant: "default" },
  in_progress: { label: "En Curso", variant: "success" },
  completed: { label: "Completada", variant: "secondary" },
  canceled: { label: "Cancelada", variant: "destructive" },
};

const channelLabels = {
  chatbot: "ChatBot/WhatsApp",
  reception: "Llamada Telefónica",
  in_person: "Presencial con Cita",
  walk_in: "Walk-in (sin cita)",
  web: "Web",
};

function ReservationDetailsModal({ reservation }) {
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: es });
    } catch {
      return "Fecha inválida";
    }
  };

  const paymentPercentage =
    reservation.totalAmount > 0
      ? (reservation.paidAmount / reservation.totalAmount) * 100
      : 0;

  const statusConfig = statusLabels[reservation.status] || statusLabels.pending;

  return (
    <div className="space-y-4">
      {/* HEADER COMPACTO */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-bold">{reservation.reservationCode}</p>
          <p className="text-sm text-muted-foreground">Reserva del sistema</p>
        </div>
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </div>

      <Separator />

      {/* HUÉSPED */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
          Huésped Principal
        </p>
        <p className="text-base font-medium">{reservation.guestName}</p>
      </div>

      <Separator />

      {/* FECHAS - GRID COMPACTO */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
            Check-in
          </p>
          <p className="text-sm">📅 {formatDate(reservation.checkIn)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
            Check-out
          </p>
          <p className="text-sm">📅 {formatDate(reservation.checkOut)}</p>
        </div>
      </div>

      <Separator />

      {/* CANAL Y HUÉSPEDES */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
            Canal de Contacto
          </p>
          <p className="text-sm">
            📞 {channelLabels[reservation.channel] || reservation.channel}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
            Total Huéspedes
          </p>
          <p className="text-sm">
            👥 {reservation.totalGuests}{" "}
            {reservation.totalGuests === 1 ? "persona" : "personas"}
          </p>
        </div>
      </div>

      {/* SERVICIOS */}
      {reservation.services && reservation.services.length > 0 && (
        <>
          <Separator />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              Servicios Contratados
            </p>
            <div className="flex flex-wrap gap-2">
              {reservation.services.map((service, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {service}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* PAGOS - COMPACTO */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">
          Información de Pago
        </p>

        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Monto Total</p>
            <p className="text-lg font-bold">
              ${reservation.totalAmount.toLocaleString("es-CL")}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Monto Pagado</p>
            <p className="text-lg font-bold text-green-600">
              ${reservation.paidAmount.toLocaleString("es-CL")}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-xs font-medium">Progreso de Pago</p>
            <p className="text-xs font-semibold">
              {paymentPercentage.toFixed(0)}%
            </p>
          </div>
          <Progress value={paymentPercentage} className="h-2" />
        </div>

        {paymentPercentage < 100 && (
          <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-md p-2">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-500">
              💰 Saldo Pendiente:{" "}
              <span className="font-bold">
                $
                {(
                  reservation.totalAmount - reservation.paidAmount
                ).toLocaleString("es-CL")}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReservationDetailsModal;
