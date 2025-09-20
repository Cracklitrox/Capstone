
import React, { useEffect, useState } from "react";
import RoomCard from "./RoomCard";
import { fetchRooms } from "../services/rooms";

const floors = ["Todos los pisos", 1, 2, 3];

function RoomBoard() {
  const [rooms, setRooms] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState("Todos los pisos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRooms()
      .then((data) => setRooms(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Adaptar los datos del backend al formato esperado por RoomCard
  const mappedRooms = rooms.map((room) => ({
    number: room.room_number,
    type: room.room_type_id, // Puedes mapear a nombre si tienes la relación
    floor: room.floor,
    status: room.status,
  }));

  const filteredRooms =
    selectedFloor === "Todos los pisos"
      ? mappedRooms
      : mappedRooms.filter((r) => r.floor === selectedFloor);

  if (loading) return <div>Cargando habitaciones...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {/* Filtro de pisos */}
      <div className="flex justify-end items-center mb-4">
        <select
          className="border rounded px-2 py-1"
          value={selectedFloor}
          onChange={(e) =>
            setSelectedFloor(
              e.target.value === "Todos los pisos" ? "Todos los pisos" : Number(e.target.value)
            )
          }
        >
          {floors.map((f) => (
            <option key={f} value={f}>
              {f === "Todos los pisos" ? f : `Piso ${f}`}
            </option>
          ))}
        </select>
      </div>

      {/* Grid de habitaciones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredRooms.map((room) => (
          <RoomCard key={room.number} room={room} />
        ))}
      </div>

      {/* Leyenda de colores para los estados */}
      <div className="mt-8 p-4 bg-white rounded-lg shadow">
        <h3 className="text-xl font-bold text-gray-700 mb-3">Leyenda</h3>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center"><span className="h-4 w-4 mr-2 bg-green-500 rounded-full border border-gray-200"></span>Disponible</div>
          <div className="flex items-center"><span className="h-4 w-4 mr-2 bg-red-500 rounded-full border border-gray-200"></span>Ocupado</div>
          <div className="flex items-center"><span className="h-4 w-4 mr-2 bg-blue-500 rounded-full border border-gray-200"></span>Limpieza</div>
          <div className="flex items-center"><span className="h-4 w-4 mr-2 bg-gray-800 rounded-full border border-gray-200"></span>Mantenimiento</div>
          <div className="flex items-center"><span className="h-4 w-4 mr-2 bg-orange-500 rounded-full border border-gray-200"></span>Reservado Pendiente</div>
        </div>
      </div>
    </div>
  );
}

export default RoomBoard;
