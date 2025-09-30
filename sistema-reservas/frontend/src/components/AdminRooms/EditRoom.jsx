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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modificar habitación</DialogTitle>
            <DialogDescription>
              Edita los datos permitidos de la habitación seleccionada.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 bg-card text-card-foreground rounded-xl shadow-md p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Número</Label>
                <div className="py-2 px-3 bg-secondary text-primary rounded font-semibold">{room.room_number}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Estado</Label>
                <div className="py-2 px-3 bg-secondary text-primary rounded font-semibold">{room.status}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Piso</Label>
                <select name="floor" value={form.floor} onChange={handleChange} required className="mt-1 w-full border border-input rounded px-3 py-2 bg-secondary text-primary">
                  <option value="">Selecciona piso</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </div>
              <div>
                <Label className="text-muted-foreground">Tipo de habitación</Label>
                <select name="room_type_id" value={form.room_type_id} onChange={handleChange} required className="mt-1 w-full border border-input rounded px-3 py-2 bg-secondary text-primary">
                  <option value="">Selecciona tipo</option>
                  {roomTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-muted-foreground">Capacidad</Label>
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
                  className="mt-1 w-full border border-input rounded px-3 py-2 bg-secondary text-primary"
                />
              </div>
              <div>
                <Label className="text-muted-foreground">Precio base</Label>
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
                  className="mt-1 w-full border border-input rounded px-3 py-2 bg-secondary text-primary"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-muted-foreground">Descripción</Label>
                <Input
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  maxLength={150}
                  placeholder="Descripción breve de la habitación"
                  className="mt-1 w-full border border-input rounded px-3 py-2 bg-secondary text-primary"
                />
                <div className={`text-xs ${form.description.length > 140 ? "text-destructive" : "text-muted-foreground"} mt-1`}>
                  {form.description.length}/150 caracteres
                </div>
              </div>
            </div>
            {/* Campo activo fuera del grid */}
            <div>
              <Label className="text-muted-foreground">Activo</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={e => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="accent-primary w-4 h-4 rounded focus:ring-2 focus:ring-primary"
                />
                <span className={`font-semibold ${form.is_active ? 'text-green-700 dark:text-green-300' : 'text-destructive'}`}>{form.is_active ? 'Sí' : 'No'}</span>
              </div>
            </div>
            {error && <p className="text-destructive mt-2">{error}</p>}
            <DialogFooter className="flex flex-row gap-2 justify-end mt-4">
              <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded shadow">Guardar</Button>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="bg-secondary text-secondary-foreground font-semibold px-4 py-2 rounded shadow">Cancelar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditRoom;
