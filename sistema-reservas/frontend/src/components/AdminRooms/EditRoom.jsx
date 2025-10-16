import React, { useState } from "react";
import { updateAdminRoom } from "../../services/adminRooms";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/Dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";

const EditRoom = ({ token, room, roomTypes, onUpdated, rooms }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    floor:
      room.floor !== undefined && room.floor !== null ? String(room.floor) : "",
    room_type_id:
      room.room_type_id !== undefined && room.room_type_id !== null
        ? String(room.room_type_id)
        : "",
    capacity:
      room.capacity !== undefined && room.capacity !== null
        ? String(room.capacity)
        : "",
    base_price:
      room.base_price !== undefined && room.base_price !== null
        ? String(room.base_price)
        : "",
    description: room.description ?? "",
    is_active: room.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let val = value;

    // Validaciones en tiempo real
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
    if (form.floor === "" || !["1", "2", "3"].includes(form.floor)) {
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
      await updateAdminRoom(
        room.id,
        {
          floor: Number(form.floor),
          room_type_id: Number(form.room_type_id),
          capacity: Number(form.capacity),
          base_price: Number(form.base_price),
          description: form.description,
          is_active: !!form.is_active,
        },
        token
      );
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
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="w-full"
      >
        Modificar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Modificar Habitación
            </DialogTitle>
            <DialogDescription>
              Edita los datos permitidos de la habitación seleccionada.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            {/* Campos NO editables - Solo lectura */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Número (No editable)
                </Label>
                <div className="flex items-center justify-center h-10 bg-muted/50 rounded-md border border-input">
                  <span className="text-lg font-bold text-foreground">
                    {room.room_number}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Estado (No editable)
                </Label>
                <div className="flex items-center justify-center h-10 bg-muted/50 rounded-md border border-input">
                  <span className="text-sm font-semibold text-foreground capitalize">
                    {room.status === "available"
                      ? "Disponible"
                      : room.status === "occupied"
                        ? "Ocupada"
                        : room.status === "pending"
                          ? "Pendiente"
                          : room.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Campos editables */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Piso */}
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

              {/* Tipo de habitación */}
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

              {/* Capacidad */}
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

              {/* Precio base */}
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
                <p className="text-xs text-muted-foreground">Máximo $100.000</p>
              </div>
            </div>

            {/* Descripción - Ocupa todo el ancho */}
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

            {/* Estado activo/inactivo */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-input">
              <div className="space-y-0.5">
                <Label htmlFor="is_active" className="text-base font-medium">
                  Estado de la Habitación
                </Label>
                <p className="text-sm text-muted-foreground">
                  {form.is_active
                    ? "La habitación está activa y disponible"
                    : "La habitación está inactiva (no acepta reservas)"}
                </p>
              </div>
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, is_active: checked }))
                }
              />
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
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditRoom;
