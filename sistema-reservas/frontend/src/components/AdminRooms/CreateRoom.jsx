import React, { useState } from "react";
import { createAdminRoom } from "../../services/adminRooms";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";

const initialState = {
  room_number: "",
  floor: "",
  room_type_id: "",
  capacity: "",
  base_price: "",
  description: "",
};

const CreateRoom = ({ token, onCreated, roomTypes }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let val = value;
    // Validaciones en tiempo real
    if (name === "room_number") {
      // Solo números, rango 0-999
      val = val.replace(/\D/g, "");
      if (val !== "" && (Number(val) < 0 || Number(val) > 999)) return;
    }
    if (name === "floor") {
      // Solo 1, 2, 3
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
    // Validaciones finales antes de enviar
    if (
      form.room_number === "" ||
      isNaN(form.room_number) ||
      Number(form.room_number) < 0 ||
      Number(form.room_number) > 999
    ) {
      setError("El número debe ser un valor entre 0 y 999.");
      setLoading(false);
      return;
    }
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
      await createAdminRoom({
        room_number: form.room_number,
        floor: Number(form.floor),
        room_type_id: Number(form.room_type_id),
        capacity: Number(form.capacity),
        base_price: Number(form.base_price),
        description: form.description,
      }, token);
      setForm(initialState);
      setOpen(false);
      if (onCreated) onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="primary"
        className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-bold px-6 py-2 rounded-full shadow-lg flex items-center gap-2 transition-all duration-200"
        style={{letterSpacing: "0.5px"}}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        Crear habitación
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear habitación</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-900 rounded-xl shadow-md p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Número</Label>
                <Input
                  name="room_number"
                  value={form.room_number}
                  onChange={handleChange}
                  required
                  pattern="\d{1,3}"
                  min="0"
                  max="999"
                  inputMode="numeric"
                  placeholder="Ej: 101"
                  className="mt-1 w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <Label>Piso</Label>
                <select name="floor" value={form.floor} onChange={handleChange} required className="mt-1 w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  <option value="">Selecciona piso</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </div>
              <div>
                <Label>Tipo de habitación</Label>
                <select name="room_type_id" value={form.room_type_id} onChange={handleChange} required className="mt-1 w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  <option value="">Selecciona tipo</option>
                  {roomTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Capacidad</Label>
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
                  className="mt-1 w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <Label>Precio base</Label>
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
                  className="mt-1 w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Descripción</Label>
                <Input
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  maxLength={150}
                  placeholder="Descripción breve de la habitación"
                  className="mt-1 w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <div className={`text-xs ${form.description.length > 140 ? "text-red-500" : "text-muted"} mt-1`}>
                  {form.description.length}/150 caracteres
                </div>
              </div>
            </div>
            {error && <p className="text-red-500 mt-2">{error}</p>}
            <DialogFooter className="flex flex-row gap-2 justify-end mt-4">
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded shadow">Crear</Button>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-semibold px-4 py-2 rounded shadow">Cancelar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CreateRoom;
