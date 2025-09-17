import React, { useState } from "react";
import RoomCard from "./RoomCard";

// Datos mock mínimos para mostrar tarjetas vacías (sin info específica)
const mockRooms = [
  { number: "101", type: "Simple", floor: 1, status: "disponible" },
  { number: "102", type: "Doble", floor: 1, status: "ocupado" },
  { number: "105", type: "Suite", floor: 1, status: "ocupado" },
  { number: "106", type: "King", floor: 2, status: "reservado" },
  { number: "201", type: "Doble", floor: 2, status: "disponible" },
  { number: "202", type: "Simple", floor: 2, status: "mantenimiento" },
  { number: "301", type: "Suite", floor: 3, status: "ocupado" },
  { number: "302", type: "Simple", floor: 3, status: "disponible" },
];

const floors = ["Todos los pisos", 1, 2, 3];

function RoomBoard({ rooms = mockRooms }) {
  const [selectedFloor, setSelectedFloor] = useState("Todos los pisos");

  // Filtrado de habitaciones por piso
  const filteredRooms =
    selectedFloor === "Todos los pisos"
      ? rooms
      : rooms.filter((r) => r.floor === selectedFloor);

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

      {/* Grid de habitaciones (sin info específica) */}
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
