import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";


const RoomDetail = ({ open, onClose, room, roomTypeName }) => {
  if (!room) return null;

  // Mapeo de estado a español y color
  const statusMap = {
    available: { label: 'Disponible', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
    occupied: { label: 'Ocupado', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
    pending: { label: 'Pendiente', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' },
    cleaning: { label: 'Limpieza', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
    maintenance: { label: 'Mantenimiento', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300' },
  };
  const statusInfo = statusMap[room.status] || { label: room.status, color: 'bg-muted text-muted-foreground' };


  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-card via-card/80 to-card/60 text-card-foreground border border-input rounded-3xl shadow-2xl p-4 md:p-8 max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl md:text-3xl font-extrabold mb-2 text-[var(--primary)] flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17l4 4 4-4m-4-5v9" /></svg>
            Detalle de habitación
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">Información completa de la habitación seleccionada.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="flex flex-col gap-1">
            <Label className="font-semibold text-[var(--secondary)]">Número</Label>
            <div className="border border-input bg-card text-card-foreground rounded-lg px-3 py-2 font-bold text-lg">{room.room_number}</div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="font-semibold text-[var(--secondary)]">Piso</Label>
            <div className="border border-input bg-card text-card-foreground rounded-lg px-3 py-2">{room.floor}</div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="font-semibold text-[var(--secondary)]">Tipo de habitación</Label>
            <div className="border border-input bg-card text-card-foreground rounded-lg px-3 py-2">{roomTypeName || room.room_type_name || '-'}</div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="font-semibold text-[var(--secondary)]">Capacidad</Label>
            <div className="border border-input bg-card text-card-foreground rounded-lg px-3 py-2">{room.capacity}</div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="font-semibold text-[var(--secondary)]">Precio base</Label>
            <div className="border border-input bg-card text-card-foreground rounded-lg px-3 py-2">${room.base_price}</div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="font-semibold text-[var(--secondary)]">Estado</Label>
            <span className={`border border-input rounded-lg px-3 py-2 font-semibold ${statusInfo.color}`}>{statusInfo.label}</span>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="font-semibold text-[var(--secondary)]">Activo</Label>
            <span className={`border border-input rounded-lg px-3 py-2 font-semibold ${room.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-destructive text-destructive-foreground'}`}>{room.is_active ? 'Sí' : 'No'}</span>
          </div>
          <div className="md:col-span-2 flex flex-col gap-1">
            <Label className="font-semibold text-[var(--secondary)]">Descripción (opcional)</Label>
            <div className="border border-input bg-card text-card-foreground rounded-lg px-3 py-2 text-sm min-h-[48px]">{room.description || '-'}</div>
          </div>
        </div>
        <DialogFooter className="flex flex-row gap-2 justify-center mt-4">
          <Button type="button" onClick={onClose} variant="secondary" className="bg-secondary text-primary font-semibold px-4 py-2 rounded-lg shadow">Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RoomDetail;
