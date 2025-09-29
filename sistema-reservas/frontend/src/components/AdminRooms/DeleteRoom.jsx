import React, { useState } from "react";
import { deleteAdminRoom } from "../../services/adminRooms";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";

const DeleteRoom = ({ token, roomId, roomNumber, onDeleted }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      <Button onClick={() => setOpen(true)} variant="destructive" className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded shadow">Eliminar</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" /></svg>
                ¿Eliminar habitación?
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="my-4 text-center">
            <p className="text-lg font-medium text-gray-800 dark:text-gray-100">
              ¿Estás seguro que deseas eliminar la habitación <span className="font-bold text-red-600 dark:text-red-400">{roomNumber}</span>?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Esta acción <span className="font-bold">no se puede deshacer</span>.</p>
          </div>
          {error && <p className="text-red-500 text-center mt-2">{error}</p>}
          <DialogFooter className="flex flex-row gap-2 justify-center mt-4">
            <Button onClick={handleDelete} disabled={loading} variant="destructive" className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded shadow">Eliminar</Button>
            <Button onClick={() => setOpen(false)} variant="secondary" className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-semibold px-4 py-2 rounded shadow">Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeleteRoom;
