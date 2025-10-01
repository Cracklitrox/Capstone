import React, { useState } from "react";
import { updateAdminRoom } from "../../services/adminRooms";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/Dialog";

const EditRoom = ({ token, room, roomTypes, onUpdated, rooms }) => {
  const [open, setOpen] = useState(false);
  // Solo los campos editables
  const [form, setForm] = useState({
    floor: room.floor !== undefined && room.floor !== null ? String(room.floor) : "",
    room_type_id: room.room_type_id !== undefined && room.room_type_id !== null ? String(room.room_type_id) : "",
    capacity: room.capacity !== undefined && room.capacity !== null ? String(room.capacity) : "",
    base_price: room.base_price !== undefined && room.base_price !== null ? String(room.base_price) : "",
    description: room.description ?? "",
    is_active: room.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let val = value;
    // Validaciones en tiempo real
    if (name === "floor") {
      val = val.replace(/\D/g, "");
      if (val !== "" && !["1","2","3"].includes(val)) return;
    }
    if (name === "capacity") {
      val = val.replace(/\D/g, "");
      if (val !== "" && (Number(val) < 0 || Number(val) > 10)) return;
    }
    if (name === "base_price") {
      val = val.replace(/\D/g, "");
      if (val !== "" && (Number(val) < 0 || Number(val) > 100000)) return;
    }
    if (name === "description") {
      if (val.length > 150) return;
    }
    setForm((prev) => ({
      ...prev,
      [name]: val,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // Validación: no permitir duplicidad de número (aunque no se edita)
    const roomNumberExists = rooms.some(
      (r) => r.room_number === room.room_number && r.id !== room.id
    );
    if (roomNumberExists) {
      setError("El número de habitación ya existe en otra habitación.");
      setLoading(false);
      return;
    }
    // Validaciones finales
    if (
      form.floor === "" ||
      !["1","2","3"].includes(form.floor)
    ) {
      setError("El piso solo puede ser 1, 2 o 3.");
      setLoading(false);
      return;
    }
    if (
      form.capacity === "" ||
      isNaN(form.capacity) ||
      Number(form.capacity) < 0 ||
      Number(form.capacity) > 10
    ) {
      setError("La capacidad debe ser un valor entre 0 y 10.");
      setLoading(false);
      return;
    }
    if (
      form.base_price === "" ||
      isNaN(form.base_price) ||
      Number(form.base_price) < 0 ||
      Number(form.base_price) > 100000
    ) {
      setError("El precio base debe ser un valor entre 0 y 100000.");
      setLoading(false);
      return;
    }
    if (form.description.length > 150) {
      setError("La descripción no puede superar los 150 caracteres.");
      setLoading(false);
      return;
    }
    try {
      await updateAdminRoom(room.id, {
        floor: Number(form.floor),
        room_type_id: Number(form.room_type_id),
        capacity: Number(form.capacity),
        base_price: Number(form.base_price),
        description: form.description,
        is_active: !!form.is_active,
      }, token);
      setOpen(false);
      if (onUpdated) onUpdated();
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError(err.message || "Error desconocido");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">Modificar</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gradient-to-br from-card via-card/80 to-card/60 text-card-foreground border border-input rounded-3xl shadow-2xl p-4 md:p-8 max-w-lg w-full">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl md:text-3xl font-extrabold mb-2 text-[var(--primary)]">Modificar habitación</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">Edita los datos permitidos de la habitación seleccionada.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-6 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 col-span-1">
                <Label className="font-semibold text-[var(--secondary)]">Número</Label>
                <div className="border border-input bg-card text-card-foreground rounded-lg px-3 py-2 font-bold text-lg w-full">{room.room_number}</div>
              </div>
              <div className="flex flex-col gap-1 col-span-1">
                <Label className="font-semibold text-[var(--secondary)]">Estado</Label>
                <div className="border border-input bg-card text-card-foreground rounded-lg px-3 py-2 font-semibold w-full">
                  {room.status === 'available' ? 'Disponible' : room.status === 'occupied' ? 'Ocupada' : room.status === 'pending' ? 'Pendiente' : room.status}
                </div>
              </div>
              <div className="flex flex-col gap-1 col-span-1">
                <Label className="font-semibold text-[var(--secondary)]">Piso</Label>
                <select name="floor" value={form.floor} onChange={handleChange} required className="border border-input bg-card text-card-foreground rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition w-full">
                  <option value="">Selecciona piso</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 col-span-1">
                <Label className="font-semibold text-[var(--secondary)]">Tipo de habitación</Label>
                <select name="room_type_id" value={form.room_type_id} onChange={handleChange} required className="border border-input bg-card text-card-foreground rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition w-full">
                  <option value="">Selecciona tipo</option>
                  {roomTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 col-span-1">
                <Label className="font-semibold text-[var(--secondary)]">Capacidad</Label>
                <Input
                  name="capacity"
                  value={form.capacity}
                  onChange={handleChange}
                  required
                  pattern="\d{1,2}"
                  min="0"
                  max="10"
                  inputMode="numeric"
                  placeholder="Ej: 2"
                  className="border border-input bg-card text-card-foreground rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition w-full"
                />
              </div>
              <div className="flex flex-col gap-1 col-span-1">
                <Label className="font-semibold text-[var(--secondary)]">Precio base</Label>
                <Input
                  name="base_price"
                  value={form.base_price}
                  onChange={handleChange}
                  required
                  pattern="\d{1,6}"
                  min="0"
                  max="100000"
                  inputMode="numeric"
                  placeholder="Ej: 35000"
                  className="border border-input bg-card text-card-foreground rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition w-full"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1 col-span-2">
              <Label className="font-semibold text-[var(--secondary)]">Descripción (opcional)</Label>
              <textarea
                name="description"
                className="border border-input bg-card text-card-foreground rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition resize-none w-full"
                placeholder="Máximo 150 caracteres"
                value={form.description}
                onChange={handleChange}
                maxLength={150}
                rows={3}
              />
              <span className="text-xs text-muted-foreground self-end">{form.description.length}/150</span>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <Label className="font-semibold text-[var(--secondary)]">Activo</Label>
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                className="accent-primary w-4 h-4 rounded focus:ring-2 focus:ring-primary"
              />
              <span className={`font-semibold ${form.is_active ? 'text-green-700 dark:text-green-300' : 'text-destructive'}`}>{form.is_active ? 'Sí' : 'No'}</span>
            </div>
            {error && <p className="text-destructive text-sm text-center mt-2 col-span-2">{error}</p>}
            <DialogFooter className="flex flex-row gap-2 justify-center mt-4 col-span-2">
              <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg shadow hover:bg-primary/80 transition">Guardar</Button>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="bg-secondary text-primary font-semibold px-4 py-2 rounded-lg shadow">Cancelar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditRoom;
