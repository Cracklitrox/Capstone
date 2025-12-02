import React, { useState } from "react";
import { createAdminRoom } from "../../../../services/adminRooms";
import { Input } from "../../../ui/Input";
import { Label } from "../../../ui/Label";
import { Button } from "../../../ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../../ui/Dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/Select";
import { PlusIcon } from "@heroicons/react/24/outline";

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
      val = val.replace(/\D/g, "");
      if (val !== "" && (Number(val) < 0 || Number(val) > 999)) return;
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

    // Validaciones finales
    if (
      form.room_number === "" ||
      isNaN(form.room_number) ||
      Number(form.room_number) < 1 ||
      Number(form.room_number) > 999
    ) {
      setError("El número debe ser un valor entre 1 y 999.");
      setLoading(false);
      return;
    }
    if (form.floor === "" || !["1", "2", "3"].includes(form.floor)) {
      setError("El piso solo puede ser 1, 2 o 3.");
      setLoading(false);
      return;
    }
    if (
      form.capacity === "" ||
      isNaN(form.capacity) ||
      Number(form.capacity) < 1 ||
      Number(form.capacity) > 10
    ) {
      setError("La capacidad debe ser un valor entre 1 y 10.");
      setLoading(false);
      return;
    }
    if (
      form.base_price === "" ||
      isNaN(form.base_price) ||
      Number(form.base_price) < 1 ||
      Number(form.base_price) > 100000
    ) {
      setError("El precio base debe ser un valor entre 1 y 100000.");
      setLoading(false);
      return;
    }
    if (form.description.length > 150) {
      setError("La descripción no puede superar los 150 caracteres.");
      setLoading(false);
      return;
    }

    try {
      await createAdminRoom(
        {
          room_number: form.room_number,
          floor: Number(form.floor),
          room_type_id: Number(form.room_type_id),
          capacity: Number(form.capacity),
          base_price: Number(form.base_price),
          description: form.description,
        },
        token
      );
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
      <Button onClick={() => setOpen(true)} className="gap-2">
        <PlusIcon className="h-5 w-5" />
        Crear Habitación
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Crear Nueva Habitación
            </DialogTitle>
            <DialogDescription>
              Completa los datos para crear una nueva habitación en el sistema.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            {/* Primera fila: Número y Piso */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room_number">Número de Habitación *</Label>
                <Input
                  id="room_number"
                  name="room_number"
                  type="text"
                  inputMode="numeric"
                  placeholder="Ej: 101"
                  value={form.room_number}
                  onChange={handleChange}
                  required
                />
                <p className="text-xs text-muted-foreground">Entre 1 y 999</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="floor">Piso *</Label>
                <Select
                  value={form.floor}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, floor: value }))
                  }
                >
                  <SelectTrigger id="floor">
                    <SelectValue placeholder="Selecciona piso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Piso 1</SelectItem>
                    <SelectItem value="2">Piso 2</SelectItem>
                    <SelectItem value="3">Piso 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Segunda fila: Tipo y Capacidad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room_type_id">Tipo de Habitación *</Label>
                <Select
                  value={form.room_type_id}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, room_type_id: value }))
                  }
                >
                  <SelectTrigger id="room_type_id">
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {roomTypes.map((type) => (
                      <SelectItem key={type.id} value={String(type.id)}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Capacidad *</Label>
                <Input
                  id="capacity"
                  name="capacity"
                  type="text"
                  inputMode="numeric"
                  placeholder="Ej: 2"
                  value={form.capacity}
                  onChange={handleChange}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Máximo 10 personas
                </p>
              </div>
            </div>

            {/* Tercera fila: Precio */}
            <div className="space-y-2">
              <Label htmlFor="base_price">Precio Base *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="base_price"
                  name="base_price"
                  type="text"
                  inputMode="numeric"
                  placeholder="35000"
                  className="pl-7"
                  value={form.base_price}
                  onChange={handleChange}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Máximo $100.000 por noche
              </p>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción (Opcional)</Label>
              <textarea
                id="description"
                name="description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                placeholder="Describe características especiales de la habitación..."
                value={form.description}
                onChange={handleChange}
                maxLength={150}
                rows={3}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Máximo 150 caracteres
                </p>
                <p className="text-xs text-muted-foreground">
                  {form.description.length}/150
                </p>
              </div>
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive text-center">{error}</p>
              </div>
            )}

            {/* Footer con botones */}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setForm(initialState);
                  setOpen(false);
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creando..." : "Crear Habitación"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateRoom;
