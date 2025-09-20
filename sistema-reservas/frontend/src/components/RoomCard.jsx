import React from "react";

const statusColors = {
  disponible: "bg-green-100 border-green-400 text-green-800",
  ocupado: "bg-red-100 border-red-400 text-red-800",
  limpieza: "bg-blue-100 border-blue-400 text-blue-800",
  mantenimiento: "bg-gray-100 border-gray-400 text-gray-800",
  reservado: "bg-orange-100 border-orange-400 text-orange-800",
};

/**
 * Tarjeta visual de habitación.
 * Solo muestra número, tipo y piso. No muestra info dinámica (huésped, fechas, etc).
 * El contenido se actualizará cuando se integre el CRUD.
 */

function RoomCard({ room }) {
  const color = statusColors[room.status] || "bg-gray-100 border-gray-300 text-gray-800";
  // Si room_types está presente, mostrar el nombre, si no, mostrar el id
  const typeName = room.room_types?.name || room.type || room.room_type_id || "";
  return (
    <div
      className={`border-2 rounded-lg p-4 min-w-[180px] min-h-[110px] shadow-sm flex flex-col justify-between ${color}`}
    >
      <div className="flex justify-between items-center">
        <span className="font-bold text-lg">{room.number} - {typeName}</span>
        <span className="text-xs text-gray-500">Piso {room.floor}</span>
      </div>
      {/* Aquí se mostrará información dinámica cuando se integre el CRUD */}
    </div>
  );
}

export default RoomCard;
