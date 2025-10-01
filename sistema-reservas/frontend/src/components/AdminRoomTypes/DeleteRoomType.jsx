import React, { useState } from "react";
import { useAuth } from "@/services/authContext.jsx";
import { deleteAdminRoomType } from "@/services/adminRooms";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";

const DeleteRoomType = ({ roomTypeId, roomTypeName, onDeleted }) => {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { token } = useAuth();
  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await deleteAdminRoomType(roomTypeId, token);
      setOpen(false);
      if (onDeleted) onDeleted();
    } catch (err) {
      // Si el backend responde con un error de conflicto, mostrar mensaje específico
      if (err?.response?.status === 409 || (err?.response?.data?.code === "TYPE_IN_USE")) {
        setError("No se puede eliminar este tipo porque está asignado a una o más habitaciones.");
      } else {
        setError(err?.response?.data?.message || err.message || "Error al eliminar");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="destructive" className="bg-destructive hover:bg-destructive/80 text-destructive-foreground font-semibold px-4 py-2 rounded-lg shadow-md transition">Eliminar</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-gradient-to-br from-card via-card/80 to-card/60 text-card-foreground border border-input rounded-3xl shadow-2xl p-4 md:p-8 max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-center text-3xl md:text-4xl font-extrabold mb-4 text-destructive tracking-tight flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-destructive animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={2} fill="#ef4444" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" /></svg>
              Eliminar tipo de habitación
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-2 my-4">
            <p className="text-lg font-medium text-card-foreground text-center mt-2">
              ¿Estás seguro que deseas eliminar el tipo <span className="font-bold text-destructive">{roomTypeName}</span>?
            </p>
            <p className="text-sm text-muted-foreground text-center">Esta acción <span className="font-bold">no se puede deshacer</span>.</p>
          </div>
          {error && <p className="text-destructive text-center mt-2">{error}</p>}
          <DialogFooter className="flex flex-row gap-2 justify-center mt-4">
            <Button onClick={handleDelete} disabled={loading} variant="destructive" className="bg-destructive hover:bg-destructive/80 text-white font-semibold px-4 py-2 rounded-lg shadow transition">Eliminar</Button>
            <Button onClick={() => setOpen(false)} variant="secondary" className="bg-secondary text-primary font-semibold px-4 py-2 rounded-lg shadow">Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeleteRoomType;
