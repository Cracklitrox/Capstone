import React, { useEffect, useState, useMemo } from "react";
import RoomCard from "./RoomCard";
import { fetchRooms } from "../services/rooms";
import { fetchRoomDetails } from "../services/roomDetails";

const FLOORS = ["Todos los pisos", 1, 2, 3];
const STATUS_OPTIONS = [
  "Todos los estados",
  "Disponible",
  "Ocupado",
  "Limpieza",
  "Mantenimiento",
  "Pendiente"
];

  function RoomBoard({ rooms: roomsProp, loading: propLoading, error: propError }) {
  // HOOKS SIEMPRE AL INICIO
  const [rooms, setRooms] = useState(roomsProp ?? []);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomDetails, setRoomDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState("Todos los pisos");
  const [loading, setLoading] = useState(roomsProp ? false : true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("Todos los estados");
  const [page, setPage] = useState(1);
  const CARDS_PER_PAGE = 8;

    // Carga inicial solo si no hay roomsProp
    useEffect(() => {
      if (!roomsProp) {
        let mounted = true;
        (async () => {
          try {
            const data = await fetchRooms();
            if (mounted) setRooms(Array.isArray(data) ? data : []);
          } catch (err) {
            if (mounted) setError(err?.message || "Error al cargar habitaciones");
          } finally {
            if (mounted) setLoading(false);
          }
        })();
        return () => { mounted = false; };
      }
    }, [roomsProp]);

    // Filtro por piso y estado
    const filteredRooms = useMemo(() => {
      if (!Array.isArray(rooms)) return [];
      let result = rooms;
      if (selectedFloor !== "Todos los pisos") {
        result = result.filter((r) => Number(r.floor) === Number(selectedFloor));
      }
      if (selectedStatus !== "Todos los estados") {
        const statusMap = {
          "Disponible": ["available"],
          "Ocupado": ["occupied"],
          "Limpieza": ["cleaning"],
          "Mantenimiento": ["maintenance"],
          "Pendiente": ["pending", "pendiente"]
        };
        const validStates = statusMap[selectedStatus] || [];
        result = result.filter((r) => validStates.includes(String(r.status).toLowerCase()));
      }
      return result;
    }, [rooms, selectedFloor, selectedStatus]);

    // Paginación
    const pagedRooms = useMemo(() => {
      const start = (page - 1) * CARDS_PER_PAGE;
      return filteredRooms.slice(start, start + CARDS_PER_PAGE);
    }, [filteredRooms, page]);

    // Mostrar mensaje de loading global si la prop loading está presente
    if (propLoading || loading) {
      return <div className="p-6 text-blue-600 font-semibold">Cargando habitaciones...</div>;
    }

    // Mostrar mensaje de error global si la prop error está presente
    if (propError || error) {
      return <div className="p-6 text-red-600 font-semibold">Error: {propError || error}</div>;
    }

  const statusBadge = (status) => {
    const s = String(status || "").toLowerCase();
    const isReserved = s === "reserved" || s === "reservado";
    const isPending = s === "pending" || s === "pendiente";
    const cls =
      s === "available" ? "bg-green-500 text-white" :
      s === "occupied" ? "bg-red-500 text-white" :
      s === "cleaning" ? "bg-blue-500 text-white" :
      s === "maintenance" ? "bg-gray-800 text-white" :
      isReserved ? "bg-orange-500 text-white" :
      isPending ? "bg-orange-500 text-white" :
      "bg-gray-300 text-gray-800";
    const label =
      s === "available" ? "Disponible" :
      s === "occupied" ? "Ocupado" :
      s === "cleaning" ? "Limpieza" :
      s === "maintenance" ? "Mantenimiento" :
      isReserved ? "Reservado" :
      isPending ? "Pendiente" :
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

      {/* Filtros de piso y estado */}
      <div className="flex flex-wrap justify-end items-center gap-4">
        <div className="flex flex-col">
          <label htmlFor="filtro-piso" className="text-xs font-semibold mb-1">Piso</label>
          <select
            id="filtro-piso"
            className="border rounded px-2 py-1"
            value={selectedFloor}
            onChange={(e) => {
              const v = e.target.value;
              setSelectedFloor(v === "Todos los pisos" ? "Todos los pisos" : Number(v));
              setPage(1);
            }}
          >
            {FLOORS.map((f) => (
              <option key={String(f)} value={f}>
                {f === "Todos los pisos" ? f : `Piso ${f}`}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="filtro-estado" className="text-xs font-semibold mb-1">Estado</label>
          <select
            id="filtro-estado"
            className="border rounded px-2 py-1"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid de habitaciones compactas y paginadas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 justify-center min-h-[320px]">
        {Array.isArray(pagedRooms) && pagedRooms.length > 0 ? (
          pagedRooms.map((room) => (
            <div className="p-2 h-auto" key={room.id}>
              <RoomCard
                room={room}
                onDetails={openDetails}
                compact
              />
            </div>
          ))
        ) : (
          <div className="col-span-4 text-center text-gray-500 py-8">No hay habitaciones para mostrar.</div>
        )}
      </div>

      {/* Paginación */}
      {filteredRooms.length > CARDS_PER_PAGE && (
        <div className="flex justify-center items-center gap-2 mt-2">
          <button
            className="px-3 py-1 rounded bg-gray-200 hover:bg-blue-200 text-gray-700 font-bold"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >Anterior</button>
          <span className="mx-2 text-blue-700 font-bold">Página {page} de {Math.ceil(filteredRooms.length / CARDS_PER_PAGE)}</span>
          <button
            className="px-3 py-1 rounded bg-gray-200 hover:bg-blue-200 text-gray-700 font-bold"
            disabled={page === Math.ceil(filteredRooms.length / CARDS_PER_PAGE)}
            onClick={() => setPage(page + 1)}
          >Siguiente</button>
        </div>
      )}

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
                {/* Caso reservado, ocupado, pendiente */}
                {["reserved", "reservado", "occupied", "ocupado", "pending", "pendiente"].includes(String(roomDetails.status).toLowerCase()) ? (
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
                ) : String(roomDetails.status).toLowerCase() === "cleaning" ? (
                  // Caso limpieza
                  <>
                    <div className="mt-2 font-bold text-blue-700 text-lg flex items-center gap-2">
                      <span role="img" aria-label="broom">🧹</span> Detalle de limpieza
                    </div>
                    <div className="ml-2 text-base bg-blue-50 rounded-lg p-3 border border-blue-200">
                      {roomDetails.cleaning ? (
                        <>
                          <div><b className="text-gray-700">Hora de inicio:</b> <span className="text-blue-900">{roomDetails.cleaning.start_time ? new Date(roomDetails.cleaning.start_time).toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'No registrada'}</span></div>
                          <div><b className="text-gray-700">Hora de término:</b> <span className="text-blue-900">{roomDetails.cleaning.end_time ? new Date(roomDetails.cleaning.end_time).toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'En proceso'}</span></div>
                          <div><b className="text-gray-700">Observación:</b> <span className="text-gray-800">{roomDetails.cleaning.notes || 'Sin observación'}</span></div>
                        </>
                      ) : (
                        <div className="text-blue-700 font-semibold">Esta habitación está siendo limpiada por el personal.</div>
                      )}
                    </div>
                  </>
                ) : String(roomDetails.status).toLowerCase() === "maintenance" ? (
                  // Caso mantenimiento
                  <>
                    <div className="mt-2 font-bold text-gray-800 text-lg flex items-center gap-2">
                      <span role="img" aria-label="tools">🛠️</span> Detalle de mantenimiento
                    </div>
                    <div className="ml-2 text-base bg-gray-100 rounded-lg p-3 border border-gray-400">
                      {roomDetails.maintenance ? (
                        <>
                          <div><b className="text-gray-700">Categoría:</b> <span className="text-blue-900">{roomDetails.maintenance.category || 'Sin categoría'}</span></div>
                          <div><b className="text-gray-700">Descripción:</b> <span className="text-gray-800">{roomDetails.maintenance.description || 'Sin descripción'}</span></div>
                          <div><b className="text-gray-700">Fecha de comienzo:</b> <span className="text-blue-900">{roomDetails.maintenance.start_date ? new Date(roomDetails.maintenance.start_date).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No registrada'}</span></div>
                          <div><b className="text-gray-700">Fecha de término:</b> <span className="text-blue-900">{roomDetails.maintenance.end_date ? new Date(roomDetails.maintenance.end_date).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'En proceso'}</span></div>
                          <div><b className="text-gray-700">Prioridad:</b> <span className="text-red-700 font-bold">{roomDetails.maintenance.priority || 'Sin prioridad'}</span></div>
                          <div><b className="text-gray-700">Estado:</b> <span className="text-gray-800">{roomDetails.maintenance.status || 'Sin estado'}</span></div>
                        </>
                      ) : (
                        <div className="text-gray-700 font-semibold">Esta habitación está en mantenimiento.</div>
                      )}
                    </div>
                  </>
                ) : (
                  // Caso disponible
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
