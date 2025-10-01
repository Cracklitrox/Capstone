import React, { useState } from "react";
import { deleteAdminRoom } from "../../services/adminRooms";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";

const DeleteRoom = ({ token, roomId, roomNumber, onDeleted, roomStatus }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Solo permitir eliminar si el estado es 'Disponible' (soporta inglés y español)
  const isDeletable = roomStatus === 'Disponible' || roomStatus === 'available';

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
        className="bg-destructive hover:bg-destructive/80 text-destructive-foreground font-semibold px-4 py-2 rounded shadow"
        disabled={!isDeletable}
        title={!isDeletable ? "Solo se puede eliminar habitaciones en estado Disponible" : "Eliminar"}
      >
        Eliminar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gradient-to-br from-card via-card/80 to-card/60 text-card-foreground border border-input rounded-3xl shadow-2xl p-4 md:p-8 max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl md:text-3xl font-extrabold mb-2 text-destructive">Eliminar habitación</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 items-center justify-center mt-2">
            <div className="text-destructive text-xl font-bold text-center">
              ¿Eliminar habitación?
            </div>
            <p className="text-lg font-medium text-card-foreground text-center">
              ¿Estás seguro que deseas eliminar la habitación <span className="font-bold text-destructive">{roomNumber}</span>?
            </p>
            {!isDeletable && (
              <p className="text-sm text-destructive text-center">Solo se puede eliminar habitaciones en estado <b>Disponible</b>.</p>
            )}
            <p className="text-sm text-muted-foreground text-center">Esta acción <span className="font-bold">no se puede deshacer</span>.</p>
            {error && <p className="text-destructive text-center mt-2">{error}</p>}
          </div>
          <DialogFooter className="flex flex-row gap-2 justify-center mt-6">
            <Button onClick={handleDelete} disabled={loading || !isDeletable} variant="destructive" className="bg-destructive hover:bg-destructive/80 text-destructive-foreground font-semibold px-4 py-2 rounded-lg shadow">Eliminar</Button>
            <Button onClick={() => setOpen(false)} variant="secondary" className="bg-secondary text-primary font-semibold px-4 py-2 rounded-lg shadow">Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeleteRoom;
