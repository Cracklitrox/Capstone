import React, { useState } from "react";
import { useAuth } from "@/services/authContext.jsx";
import { createAdminRoomType } from "@/services/adminRooms";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";


const CreateRoomType = ({ onCreated, roomTypes = [] }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [baseCapacity, setBaseCapacity] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState(null);

  const { token } = useAuth();
  const handleCreate = async () => {
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!baseCapacity || isNaN(baseCapacity) || Number(baseCapacity) < 1) {
      setError("La capacidad base debe ser un número mayor a 0.");
      return;
    }
    // Validación de nombre duplicado (case-insensitive)
    if (roomTypes.some(rt => rt.name.trim().toLowerCase() === name.trim().toLowerCase())) {
      setError("Ya existe un tipo de habitación con ese nombre.");
      return;
    }
    try {
  await createAdminRoomType({ name, base_capacity: Number(baseCapacity), description }, token);
      setOpen(false);
  setName("");
  setBaseCapacity("");
  setDescription("");
      setError(null);
      if (onCreated) onCreated();
    } catch (err) {
      // Mostrar el mensaje exacto del backend y loguear la respuesta
      if (err?.response) {
        console.error("Backend error:", err.response);
        setError(err.response.data?.message || JSON.stringify(err.response.data) || err.message);
      } else {
        setError(err.message || "Error al crear tipo de habitación");
      }
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-primary/80 transition">Crear tipo</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gradient-to-br from-card via-card/80 to-card/60 text-card-foreground border border-input rounded-3xl shadow-2xl p-4 md:p-8 max-w-lg w-full">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl md:text-3xl font-extrabold mb-2 text-[var(--primary)]">Crear tipo de habitación</DialogTitle>
          </DialogHeader>
          <form className="grid gap-6 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="nombre" className="font-semibold text-[var(--secondary)]">Nombre del tipo</label>
                <input
                  id="nombre"
                  type="text"
                  className="border border-input bg-card text-card-foreground rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition"
                  placeholder="Ej: Suite, Doble, Familiar..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={30}
                  autoComplete="off"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="capacidad" className="font-semibold text-[var(--secondary)]">Capacidad base</label>
                <input
                  id="capacidad"
                  type="number"
                  min={1}
                  className="border border-input bg-card text-card-foreground rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition"
                  placeholder="Ej: 2"
                  value={baseCapacity}
                  onChange={e => setBaseCapacity(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
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
            {error && <p className="text-destructive text-sm text-center mt-2">{error}</p>}
            <DialogFooter className="flex flex-row gap-2 justify-center mt-4">
              <Button type="button" onClick={handleCreate} className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg shadow hover:bg-primary/80 transition">Crear</Button>
              <Button type="button" onClick={() => setOpen(false)} variant="secondary" className="bg-secondary text-primary font-semibold px-4 py-2 rounded-lg shadow">Cancelar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateRoomType;
