import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";


const RoomDetail = ({ open, onClose, room, roomTypeName }) => {
  if (!room) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
  <DialogContent className="bg-card text-card-foreground rounded-2xl shadow-2xl p-8 min-w-[340px] max-w-xl border border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17l4 4 4-4m-4-5v9" /></svg>
            Detalle de habitación
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-gray-400">Información completa de la habitación seleccionada.</DialogDescription>
        </DialogHeader>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Número</Label>
            <div className="py-2 px-3 bg-secondary text-primary rounded-lg font-bold text-lg border border-border">{room.room_number}</div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Estado</Label>
            <span className={`py-2 px-3 rounded-lg font-semibold border border-border ${room.status === 'Disponible' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : room.status === 'Ocupada' ? 'bg-destructive text-destructive-foreground' : room.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-muted text-muted-foreground'}`}>{room.status}</span>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Piso</Label>
            <div className="py-2 px-3 bg-secondary text-primary rounded-lg border border-border">{room.floor}</div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Tipo</Label>
            <div className="py-2 px-3 bg-secondary text-primary rounded-lg border border-border">{roomTypeName || room.room_type_name || '-'}</div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Capacidad</Label>
            <div className="py-2 px-3 bg-secondary text-primary rounded-lg border border-border">{room.capacity}</div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Precio Base</Label>
            <div className="py-2 px-3 bg-secondary text-primary rounded-lg border border-border">${room.base_price}</div>
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Activo</Label>
            <span className={`font-semibold px-3 py-2 rounded-lg border border-border ${room.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-destructive text-destructive-foreground'}`}>{room.is_active ? 'Sí' : 'No'}</span>
          </div>
          <div className="md:col-span-2 flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Descripción</Label>
            <div className="py-2 px-3 bg-secondary text-primary rounded-lg border border-border text-sm">{room.description || '-'}</div>
          </div>
        </div>
        <DialogFooter className="flex flex-row gap-2 justify-end mt-6">
          <Button type="button" variant="secondary" onClick={onClose} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-semibold px-4 py-2 rounded-lg shadow">Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RoomDetail;
