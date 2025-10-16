import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { updateAdminRoomType } from "@/services/adminRooms";
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
import { Switch } from "@/components/ui/Switch";

const EditRoomType = ({ roomType, onUpdated }) => {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: roomType?.name || "",
    base_capacity: roomType?.base_capacity
      ? String(roomType.base_capacity)
      : "",
    description: roomType?.description || "",
    is_active: roomType?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let val = value;

    // Validaciones en tiempo real
    if (name === "name") {
      if (val.length > 30) return;
    }
    if (name === "base_capacity") {
      val = val.replace(/\D/g, "");
      if (val !== "" && (Number(val) < 0 || Number(val) > 10)) return;
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
    if (!form.name.trim()) {
      setError("El nombre es obligatorio.");
      setLoading(false);
      return;
    }

    if (
      form.base_capacity === "" ||
      isNaN(form.base_capacity) ||
      Number(form.base_capacity) < 1 ||
      Number(form.base_capacity) > 10
    ) {
      setError("La capacidad base debe ser entre 1 y 10.");
      setLoading(false);
      return;
    }

    if (form.description.length > 150) {
      setError("La descripción no puede superar los 150 caracteres.");
      setLoading(false);
      return;
    }

    try {
      await updateAdminRoomType(
        roomType.id,
        {
          name: form.name,
          base_capacity: Number(form.base_capacity),
          description: form.description,
          is_active: form.is_active,
        },
        token
      );
      setOpen(false);
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Error al modificar tipo de habitación"
      );
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
              Modificar Tipo de Habitación
            </DialogTitle>
            <DialogDescription>
              Edita las características del tipo de habitación seleccionado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            {/* Campo NO editable - Solo lectura */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                ID (No editable)
              </Label>
              <div className="flex items-center justify-center h-10 bg-muted/50 rounded-md border border-input">
                <span className="text-lg font-bold text-foreground">
                  #{roomType.id}
                </span>
              </div>
            </div>

            {/* Campos editables */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nombre */}
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Tipo *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Ej: Suite, Doble, Familiar..."
                  value={form.name}
                  onChange={handleChange}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Máximo 30 caracteres
                </p>
              </div>

              {/* Capacidad base */}
              <div className="space-y-2">
                <Label htmlFor="base_capacity">Capacidad Base *</Label>
                <Input
                  id="base_capacity"
                  name="base_capacity"
                  type="text"
                  inputMode="numeric"
                  placeholder="Ej: 2"
                  value={form.base_capacity}
                  onChange={handleChange}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Entre 1 y 10 personas
                </p>
              </div>
            </div>

            {/* Descripción - Ocupa todo el ancho */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción (Opcional)</Label>
              <textarea
                id="description"
                name="description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                placeholder="Describe las características de este tipo de habitación..."
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
                  Estado del Tipo
                </Label>
                <p className="text-sm text-muted-foreground">
                  {form.is_active
                    ? "El tipo está activo y disponible"
                    : "El tipo está inactivo (no se puede asignar)"}
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

export default EditRoomType;
