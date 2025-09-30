import React, { useState } from "react";
import { useAuth } from "@/services/authContext.jsx";
import { updateAdminRoomType } from "@/services/adminRooms";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";

const EditRoomType = ({ roomType, onUpdated }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(roomType?.name || "");
  const [baseCapacity, setBaseCapacity] = useState(roomType?.base_capacity || "");
  const [description, setDescription] = useState(roomType?.description || "");
  const [isActive, setIsActive] = useState(roomType?.is_active ?? true);
  const [error, setError] = useState(null);

  const { token } = useAuth();
  const handleEdit = async () => {
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!baseCapacity || isNaN(baseCapacity) || Number(baseCapacity) < 1) {
      setError("La capacidad base debe ser un número mayor a 0.");
      return;
    }
    try {
      await updateAdminRoomType(roomType.id, { name, base_capacity: Number(baseCapacity), description, is_active: isActive }, token);
      setOpen(false);
      setError(null);
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Error al modificar tipo de habitación");
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-primary/80 transition">Modificar</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gradient-to-br from-card via-card/80 to-card/60 text-card-foreground border border-input rounded-3xl shadow-2xl p-4 md:p-8 max-w-lg w-full">
          <DialogHeader>
            <DialogTitle className="text-center text-3xl md:text-4xl font-extrabold mb-4 text-[var(--primary)] tracking-tight flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V6a2 2 0 012-2h2m8 0h2a2 2 0 012 2v2m0 8v2a2 2 0 01-2 2h-2m-8 0H6a2 2 0 01-2-2v-2" /></svg>
              Modificar tipo de habitación
            </DialogTitle>
          </DialogHeader>
          <form className="flex flex-col gap-6 mt-2">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3 w-full">
                <div className="flex flex-col flex-1">
                  <label htmlFor="nombre" className="font-semibold text-[var(--secondary)]">Nombre del tipo</label>
                  <input
                    id="nombre"
                    type="text"
                    className="border border-input bg-card text-card-foreground rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition w-full"
                    placeholder="Ej: Suite, Doble, Familiar..."
                    value={name}
                    onChange={e => setName(e.target.value)}
                    maxLength={30}
                    autoComplete="off"
                    required
                  />
                </div>
                <div className="flex flex-col flex-1">
                  <label htmlFor="capacidad" className="font-semibold text-[var(--secondary)]">Capacidad base</label>
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17l4 4 4-4m0-5V3a1 1 0 00-1-1H9a1 1 0 00-1 1v9m0 0l4 4 4-4" /></svg>
                    <input
                      id="capacidad"
                      type="number"
                      min={1}
                      className="border border-input bg-card text-card-foreground rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition w-full"
                      placeholder="Ej: 2"
                      value={baseCapacity}
                      onChange={e => setBaseCapacity(e.target.value.replace(/\D/g, ""))}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8m-4-4v8" /></svg>
                <div className="flex flex-col w-full">
                  <label htmlFor="descripcion" className="font-semibold text-[var(--secondary)]">Descripción (opcional)</label>
                  <textarea
                    id="descripcion"
                    className="border border-input bg-card text-card-foreground rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition resize-none"
                    placeholder="Máximo 150 caracteres"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    maxLength={150}
                    rows={3}
                  />
                  <span className="text-xs text-muted-foreground self-end">{description.length}/150</span>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={2} fill={isActive ? '#22c55e' : '#ef4444'} /></svg>
                <div className="flex items-center gap-2">
                  <label htmlFor="activo" className="font-semibold text-[var(--secondary)]">Activo</label>
                  <input
                    id="activo"
                    type="checkbox"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                    className="accent-green-500 w-5 h-5 focus:ring-2 focus:ring-green-500"
                  />
                  <span className={isActive ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>{isActive ? "Activo" : "Inactivo"}</span>
                </div>
              </div>
            </div>
            {error && <p className="text-destructive text-sm text-center mt-2">{error}</p>}
            <DialogFooter className="flex flex-row gap-2 justify-center mt-4">
              <Button type="button" onClick={handleEdit} className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg shadow hover:bg-primary/80 transition">Guardar</Button>
              <Button type="button" onClick={() => setOpen(false)} variant="secondary" className="bg-secondary text-primary font-semibold px-4 py-2 rounded-lg shadow">Cancelar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditRoomType;
