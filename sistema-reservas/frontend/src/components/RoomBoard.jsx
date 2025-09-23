import React, { useEffect, useState, useMemo } from "react";
import RoomCard from "./RoomCard";
import { fetchRooms } from "../services/rooms";
import { fetchRoomDetails } from "../services/roomDetails";

const FLOORS = ["Todos los pisos", 1, 2, 3];

function RoomBoard() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomDetails, setRoomDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  const [selectedFloor, setSelectedFloor] = useState("Todos los pisos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carga inicial
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchRooms();
        if (!mounted) return;
        setRooms(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || "Error al cargar habitaciones");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Filtro por piso usando solo los datos directos del backend
  const filteredRooms = useMemo(() => {
    if (!Array.isArray(rooms)) return [];
    if (selectedFloor === "Todos los pisos") return rooms;
    return rooms.filter((r) => Number(r.floor) === Number(selectedFloor));
  }, [rooms, selectedFloor]);

  const statusBadge = (status) => {
    const s = String(status || "").toLowerCase();
    const isReserved = s === "reserved" || s === "reservado";
    const cls =
      s === "available" ? "bg-green-500 text-white" :
      s === "occupied" ? "bg-red-500 text-white" :
      s === "cleaning" ? "bg-blue-500 text-white" :
      s === "maintenance" ? "bg-gray-800 text-white" :
      isReserved ? "bg-orange-500 text-white" :
      "bg-gray-300 text-gray-800";
    const label =
      s === "available" ? "Disponible" :
      s === "occupied" ? "Ocupado" :
      s === "cleaning" ? "Limpieza" :
      s === "maintenance" ? "Mantenimiento" :
      isReserved ? "Reservado" :
      status ?? "Desconocido";
    return <span className={`px-2 py-1 rounded ${cls}`}>{label}</span>;
  };

  const openDetails = async (r) => {
    setSelectedRoom(r);
    setDetailsLoading(true);
    setDetailsError(null);
    setRoomDetails(null);
    try {
      const details = await fetchRoomDetails(r.id);
      setRoomDetails(details);
    } catch (err) {
      setDetailsError(err?.message || "Error al cargar detalles");
    } finally {
      setDetailsLoading(false);
    }
  };

  // Loading / Error globales
  if (loading) {
    return <div className="p-6">Cargando habitaciones...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Leyenda (una sola vez) */}
      <div className="p-4 bg-white rounded-lg shadow">
        <h3 className="text-xl font-bold text-gray-700 mb-3">Leyenda</h3>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center"><span className="h-4 w-4 mr-2 bg-green-500 rounded-full border border-gray-200"></span>Disponible</div>
          <div className="flex items-center"><span className="h-4 w-4 mr-2 bg-red-500 rounded-full border border-gray-200"></span>Ocupado</div>
          <div className="flex items-center"><span className="h-4 w-4 mr-2 bg-blue-500 rounded-full border border-gray-200"></span>Limpieza</div>
          <div className="flex items-center"><span className="h-4 w-4 mr-2 bg-gray-800 rounded-full border border-gray-200"></span>Mantenimiento</div>
          <div className="flex items-center"><span className="h-4 w-4 mr-2 bg-orange-500 rounded-full border border-gray-200"></span>Reservado Pendiente</div>
        </div>
      </div>

      {/* Filtro de pisos */}
      <div className="flex justify-end items-center">
        <select
          className="border rounded px-2 py-1"
          value={selectedFloor}
          onChange={(e) => {
            const v = e.target.value;
            setSelectedFloor(v === "Todos los pisos" ? "Todos los pisos" : Number(v));
          }}
        >
          {FLOORS.map((f) => (
            <option key={String(f)} value={f}>
              {f === "Todos los pisos" ? f : `Piso ${f}`}
            </option>
          ))}
        </select>
      </div>

      {/* Grid de habitaciones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.isArray(filteredRooms) && filteredRooms.length > 0 && filteredRooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            onDetails={openDetails}
          />
        ))}
      </div>

      {/* Modal de Detalles */}
      {selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-white via-gray-50 to-blue-100 rounded-2xl p-8 min-w-[340px] max-w-[95vw] shadow-2xl border-2 border-blue-200 relative animate-fadeIn">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-blue-600 text-2xl font-bold transition-colors"
              onClick={() => { setSelectedRoom(null); setRoomDetails(null); }}
              title="Cerrar"
              aria-label="Cerrar"
            >
              ×
            </button>
            <h2 className="text-3xl font-extrabold mb-4 text-blue-700 flex items-center gap-2">
              <span role="img" aria-label="room">🛏️</span> Detalles de la habitación
            </h2>
            {detailsLoading && <div className="text-blue-600 font-semibold">Cargando detalles...</div>}
            {detailsError && <div className="text-red-600 font-semibold">{detailsError}</div>}
            {roomDetails && (
              <div className="space-y-3 text-base">
                <div className="flex flex-wrap gap-4 items-center mb-2">
                  <div><span className="font-bold text-gray-700">Número:</span> <span className="text-lg font-mono text-blue-800">{roomDetails.room_number}</span></div>
                  <div><span className="font-bold text-gray-700">Piso:</span> <span className="text-blue-800">{roomDetails.floor}</span></div>
                  <div><span className="font-bold text-gray-700">Tipo:</span> <span className="text-blue-800">{roomDetails.room_types?.name}</span></div>
                  <div><span className="font-bold text-gray-700">Estado:</span> {statusBadge(roomDetails.status)}</div>
                </div>
                {/* Caso reservado u ocupado */}
                {["reserved", "reservado", "occupied", "ocupado"].includes(String(roomDetails.status).toLowerCase()) ? (
                  <>
                    <div className="mt-2 font-bold text-blue-700 text-lg flex items-center gap-2">
                      <span role="img" aria-label="calendar">📅</span> Datos de la última reserva
                    </div>
                    <div className="ml-2 text-base bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div><b className="text-gray-700">Código reserva:</b> <span className="font-mono">{roomDetails.reservation_rooms[0]?.reservations?.code}</span></div>
                      <div><b className="text-gray-700">Check-in:</b> {roomDetails.reservation_rooms[0]?.reservations?.check_in_date?.slice(0,10)}</div>
                      <div><b className="text-gray-700">Check-out:</b> {roomDetails.reservation_rooms[0]?.reservations?.check_out_date?.slice(0,10)}</div>
                      <div>
                        <b className="text-gray-700">Huésped principal:</b>{" "}
                        <span className="font-semibold text-blue-900">{roomDetails.reservation_rooms[0]?.reservations?.users_reservations_main_guest_idTousers?.first_name}{" "}
                        {roomDetails.reservation_rooms[0]?.reservations?.users_reservations_main_guest_idTousers?.paternal_last_name}</span>
                      </div>
                      <div><b className="text-gray-700">Monto total:</b> <span className="text-green-700 font-bold">${roomDetails.reservation_rooms[0]?.reservations?.total_amount}</span></div>
                      <div><b className="text-gray-700">Monto pagado:</b> <span className="text-blue-700 font-bold">${roomDetails.reservation_rooms[0]?.reservations?.paid_amount}</span></div>
                      <div><b className="text-gray-700">Pendiente de pago:</b> <span className="text-red-700 font-bold">${(roomDetails.reservation_rooms[0]?.reservations?.total_amount || 0) - (roomDetails.reservation_rooms[0]?.reservations?.paid_amount || 0)}</span></div>
                    </div>
                  </>
                ) : (
                  // Caso NO reservado
                  <>
                    <div className="mt-2 font-bold text-blue-700 text-lg flex items-center gap-2">
                      <span role="img" aria-label="info">ℹ️</span> Información de la habitación
                    </div>
                    <div className="ml-2 text-base bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div><b className="text-gray-700">Capacidad:</b> {roomDetails.capacity}</div>
                      <div><b className="text-gray-700">Precio base:</b> <span className="text-green-700 font-bold">${roomDetails.base_price}</span></div>
                      {roomDetails.description && <div><b className="text-gray-700">Descripción:</b> {roomDetails.description}</div>}
                      {roomDetails.room_types?.description && (
                        <div><b className="text-gray-700">Tipo descripción:</b> {roomDetails.room_types.description}</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RoomBoard;
