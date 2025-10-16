import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createAdminRoomType } from "@/services/adminRooms";
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
import { PlusIcon } from "@heroicons/react/24/outline";

const initialState = {
  name: "",
  base_capacity: "",
  description: "",
};

const CreateRoomType = ({ onCreated, roomTypes = [] }) => {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialState);
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

    // Validación de nombre duplicado (case-insensitive)
    const normalizeName = (str) =>
      str
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/\s+/g, "_");

    if (
      roomTypes.some(
        (rt) => normalizeName(rt.name) === normalizeName(form.name)
      )
    ) {
      setError("Ya existe un tipo de habitación con ese nombre.");
      setLoading(false);
      return;
    }

    if (form.description.length > 150) {
      setError("La descripción no puede superar los 150 caracteres.");
      setLoading(false);
      return;
    }

    try {
      await createAdminRoomType(
        {
          name: form.name,
          base_capacity: Number(form.base_capacity),
          description: form.description,
        },
        token
      );
      setForm(initialState);
      setOpen(false);
      if (onCreated) onCreated();
    } catch (err) {
      if (err?.response) {
        console.error("Backend error:", err.response);
        setError(
          err.response.data?.message ||
            JSON.stringify(err.response.data) ||
            err.message
        );
      } else {
        setError(err.message || "Error al crear tipo de habitación");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <PlusIcon className="h-5 w-5" />
        Crear Tipo
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Crear Tipo de Habitación
            </DialogTitle>
            <DialogDescription>
              Define las características base de un nuevo tipo de habitación.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            {/* Primera fila: Nombre y Capacidad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* Descripción */}
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
                {loading ? "Creando..." : "Crear Tipo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateRoomType;
