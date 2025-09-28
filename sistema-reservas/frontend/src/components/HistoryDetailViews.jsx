import React from "react";
import { Button } from "@/components/ui/Button.jsx";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

// Un componente genérico para la fila de información
const DetailRow = ({ label, value }) => (
  <div className="py-2 border-b">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="font-medium">{value || "-"}</p>
  </div>
);

// Vista para el detalle de Mantenimiento
export const MaintenanceDetailView = ({ item, onBack }) => {
  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Volver
      </Button>
      <div className="space-y-2">
        <DetailRow label="Descripción" value={item.description} />
        <DetailRow label="Estado" value={item.status} />
        <DetailRow label="Prioridad" value={item.priority} />
        <DetailRow label="Fecha de Inicio" value={new Date(item.start_date).toLocaleDateString("es-CL")} />
        <DetailRow label="Fecha de Fin" value={item.end_date ? new Date(item.end_date).toLocaleDateString("es-CL") : "En progreso"} />
      </div>
    </div>
  );
};

// Vista para el detalle de Limpieza
export const CleaningDetailView = ({ item, onBack }) => {
  return (
    <div>
       <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Volver
      </Button>
      <div className="space-y-2">
        <DetailRow label="Realizado por" value={item.receptionist} />
        <DetailRow label="Fecha" value={new Date(item.date).toLocaleDateString("es-CL")} />
        <DetailRow label="Observaciones" value={item.observations} />
      </div>
    </div>
  );
};

// Vista para el detalle de una Reserva Pasada
export const ReservationDetailView = ({ item, onBack }) => {
    return (
    <div>
       <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Volver
      </Button>
      <div className="space-y-2">
        <DetailRow label="Huésped" value={item.guestName} />
        <DetailRow label="Check-in" value={new Date(item.checkIn).toLocaleDateString("es-CL")} />
        <DetailRow label="Check-out" value={new Date(item.checkOut).toLocaleDateString("es-CL")} />
        {/* Aquí podrías agregar más detalles si los tuvieras */}
      </div>
    </div>
  );
};