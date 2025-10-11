import React, { useState } from "react";
import { useAuth } from "@/services/authContext.jsx";
import { deleteAdminRoomType } from "@/services/adminRooms";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/Dialog";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

const DeleteRoomType = ({ roomTypeId, roomTypeName, onDeleted }) => {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await deleteAdminRoomType(roomTypeId, token);
      setOpen(false);
      if (onDeleted) onDeleted();
    } catch (err) {
      // Si el backend responde con un error de conflicto
      if (
        err?.response?.status === 409 ||
        err?.response?.data?.code === "TYPE_IN_USE"
      ) {
        setError(
          "No se puede eliminar este tipo porque está asignado a una o más habitaciones."
        );
      } else {
        setError(
          err?.response?.data?.message || err.message || "Error al eliminar"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="destructive"
        size="sm"
        className="w-full"
      >
        Eliminar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-destructive/10 rounded-full">
                <ExclamationTriangleIcon className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-destructive">
                  Eliminar Tipo de Habitación
                </DialogTitle>
                <DialogDescription>
                  Esta acción no se puede deshacer
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Información del tipo */}
            <div className="p-4 bg-muted/50 rounded-lg border border-input">
              <p className="text-sm text-muted-foreground mb-2">
                Estás a punto de eliminar:
              </p>
              <p className="text-lg font-bold text-foreground">
                Tipo: {roomTypeName}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ID: #{roomTypeId}
              </p>
            </div>

            {/* Advertencia principal */}
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Esta acción eliminará permanentemente el tipo de habitación
                del sistema.
              </p>
            </div>

            {/* Advertencia sobre habitaciones asignadas */}
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                ⚠️ No se puede eliminar si hay habitaciones asignadas a este
                tipo.
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Primero debes reasignar o eliminar las habitaciones que usan
                este tipo.
              </p>
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Confirmación */}
            <p className="text-sm text-muted-foreground text-center">
              ¿Estás seguro de que deseas continuar?
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={loading}
              variant="destructive"
            >
              {loading ? "Eliminando..." : "Eliminar Tipo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeleteRoomType;
