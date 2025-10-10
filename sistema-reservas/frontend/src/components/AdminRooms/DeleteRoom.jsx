import React, { useState } from "react";
import { deleteAdminRoom } from "../../services/adminRooms";
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

const DeleteRoom = ({ token, roomId, roomNumber, onDeleted, roomStatus }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Solo permitir eliminar si el estado es 'Disponible'
  const isDeletable = roomStatus === "disponible" || roomStatus === "available";

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await deleteAdminRoom(roomId, token);
      setOpen(false);
      if (onDeleted) onDeleted();
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
        variant="destructive"
        size="sm"
        className="w-full"
        disabled={!isDeletable}
        title={
          !isDeletable
            ? "Solo se puede eliminar habitaciones en estado Disponible"
            : "Eliminar habitación"
        }
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
                  Eliminar Habitación
                </DialogTitle>
                <DialogDescription>
                  Esta acción no se puede deshacer
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Información de la habitación */}
            <div className="p-4 bg-muted/50 rounded-lg border border-input">
              <p className="text-sm text-muted-foreground mb-2">
                Estás a punto de eliminar:
              </p>
              <p className="text-lg font-bold text-foreground">
                Habitación Nº {roomNumber}
              </p>
            </div>

            {/* Advertencia */}
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Esta acción eliminará permanentemente la habitación del
                sistema.
              </p>
            </div>

            {/* Mensaje de restricción si no es eliminable */}
            {!isDeletable && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                  ⚠️ Solo se puede eliminar habitaciones en estado{" "}
                  <strong>Disponible</strong>.
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Estado actual:{" "}
                  <strong className="capitalize">{roomStatus}</strong>
                </p>
              </div>
            )}

            {/* Mensaje de error */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Confirmación */}
            {isDeletable && (
              <p className="text-sm text-muted-foreground text-center">
                ¿Estás seguro de que deseas continuar?
              </p>
            )}
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
              disabled={loading || !isDeletable}
              variant="destructive"
            >
              {loading ? "Eliminando..." : "Eliminar Habitación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeleteRoom;
