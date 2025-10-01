import React from "react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";

const DetailRoomType = ({ roomType }) => {
  const [open, setOpen] = React.useState(false);
  if (!roomType) return null;

  // Mapeo de estado
  const estado = roomType.is_active ? 'Activo' : 'Inactivo';
  const estadoColor = roomType.is_active ? 'bg-green-500' : 'bg-red-500';

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-primary/80 transition">Ver detalle</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gradient-to-br from-card via-card/80 to-card/60 text-card-foreground border border-input rounded-3xl shadow-2xl p-4 md:p-8 max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-center text-3xl md:text-4xl font-extrabold mb-4 text-[var(--primary)] tracking-tight flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V6a2 2 0 012-2h2m8 0h2a2 2 0 012 2v2m0 8v2a2 2 0 01-2 2h-2m-8 0H6a2 2 0 01-2-2v-2" /></svg>
              Detalle tipo de habitación
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-6 mt-2">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="font-semibold text-[var(--secondary)]">Nombre</span>
                <span className="text-[var(--foreground)] text-lg font-bold">{roomType.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17l4 4 4-4m0-5V3a1 1 0 00-1-1H9a1 1 0 00-1 1v9m0 0l4 4 4-4" /></svg>
              <div className="flex flex-col">
                <span className="font-semibold text-[var(--secondary)]">Capacidad base</span>
                <span className="text-[var(--foreground)] text-lg">{roomType.base_capacity}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8m-4-4v8" /></svg>
              <div className="flex flex-col">
                <span className="font-semibold text-[var(--secondary)]">Descripción</span>
                <span className="text-[var(--foreground)]">{roomType.description || <span className="text-muted-foreground">Sin descripción</span>}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={2} fill={roomType.is_active ? '#22c55e' : '#ef4444'} /></svg>
              <div className="flex flex-col">
                <span className="font-semibold text-[var(--secondary)]">Estado</span>
                <span className={`px-2 py-1 rounded-full text-white text-sm font-semibold shadow ${estadoColor}`}>{estado}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DetailRoomType;
