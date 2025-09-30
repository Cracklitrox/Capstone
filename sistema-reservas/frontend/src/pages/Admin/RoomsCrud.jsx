import React, { useEffect, useState } from "react";
import { fetchAdminRooms, fetchAdminRoomTypes } from "../../services/adminRooms";
import { useAuth } from "../../services/authContext.jsx";
import CreateRoom from "../../components/AdminRooms/CreateRoom";
import EditRoom from "../../components/AdminRooms/EditRoom";
import DeleteRoom from "../../components/AdminRooms/DeleteRoom";
import DetailRoom from "../../components/AdminRooms/DetailRoom";
import DetailRoomButton from "../../components/AdminRooms/DetailRoomButton";

const RoomsCrud = () => {
  const { token } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Filtros
  const [searchNumber, setSearchNumber] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  // Paginación por piso
  const [activeFloor, setActiveFloor] = useState("1");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const loadRoomsAndTypes = async () => {
    setLoading(true);
    setError(null);
    try {
      const [roomsData, typesData] = await Promise.all([
        fetchAdminRooms(token),
        fetchAdminRoomTypes(token),
      ]);
      setRooms(roomsData);
      setRoomTypes(typesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadRoomsAndTypes();
    // eslint-disable-next-line
  }, [token]);

  if (loading) return <p>Cargando habitaciones...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  // Filtrar y ordenar habitaciones
  // Filtrado por estado usando español y sin tildes
  const estados = [
    "disponible",
    "ocupado",
    "pendiente",
    "limpieza",
    "mantenimiento"
  ];
  // Mapeo de estados inglés <-> español
  const estadoMap = {
    available: "disponible",
    occupied: "ocupado",
    pending: "pendiente",
    unavailable: "no disponible",
    cleaning: "limpieza",
    maintenance: "mantenimiento",
    // También soporta español directo
    disponible: "disponible",
    ocupado: "ocupado",
    pendiente: "pendiente",
    "no disponible": "no disponible",
    limpieza: "limpieza",
    mantenimiento: "mantenimiento"
  };
  // ...eliminado: estadoColor, ya no se usa...
  // Normaliza estado: minúsculas, sin tildes, sin espacios extra
  const normalize = (str) => str?.toString().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim();
  // Filtra por piso activo primero
  const roomsByFloor = rooms.filter(room => String(room.floor) === activeFloor);
  const filteredRooms = roomsByFloor
    .filter(room => {
      const estadoRoom = estadoMap[normalize(room.status)] || normalize(room.status);
      const estadoFiltro = filterStatus ? normalize(filterStatus) : "";
      return (
        (searchNumber === "" || String(room.room_number).includes(searchNumber)) &&
        (filterStatus === "" || estadoRoom === estadoFiltro)
      );
    })
    .sort((a, b) => a.id - b.id);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="bg-card text-card-foreground rounded-xl shadow-lg p-6 mb-6 border border-input">
        <h2 className="text-3xl font-bold mb-4 text-card-foreground">Habitaciones</h2>
        {/* Selector de piso y filtros */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 w-full">
            {/* Selector de piso tipo paginación */}
            <div className="flex gap-2 mb-2 md:mb-0">
              {["1","2","3"].map(piso => (
                <button
                  key={piso}
                  className={`px-4 py-2 rounded font-semibold border transition-colors duration-200 min-w-[90px] ${activeFloor === piso ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-secondary-foreground border-border hover:bg-primary/10"}`}
                  onClick={() => setActiveFloor(piso)}
                >
                  Piso {piso}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="border border-input bg-card text-card-foreground rounded px-3 py-2 w-full md:w-1/3 placeholder:text-muted-foreground"
              placeholder="Buscar por número de habitación..."
              value={searchNumber}
              onChange={e => setSearchNumber(e.target.value.replace(/\D/g, ""))}
              maxLength={3}
            />
            <select
              className="border border-input bg-card text-card-foreground rounded px-3 py-2 w-full md:w-1/4"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">Todos los estados</option>
              {estados.map(e => (
                <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="mt-4 md:mt-0">
            <CreateRoom token={token} roomTypes={roomTypes} onCreated={loadRoomsAndTypes} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm md:text-base border-separate border-spacing-0 rounded-lg bg-card text-card-foreground">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="py-2 px-3 font-semibold text-left text-base tracking-wide">Número</th>
                <th className="py-2 px-3 font-semibold text-left text-base tracking-wide">Piso</th>
                <th className="py-2 px-3 font-semibold text-left text-base tracking-wide">Tipo</th>
                <th className="py-2 px-3 font-semibold text-left text-base tracking-wide">Precio Base</th>
                <th className="py-2 px-3 font-semibold text-left text-base tracking-wide">Estado</th>
                <th className="py-2 px-3 font-semibold text-left text-base tracking-wide">Activo</th>
                <th className="py-2 px-3 font-semibold text-left text-base tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((room, idx) => (
                <tr key={room.id} className={idx % 2 === 0 ? "bg-secondary" : "bg-card"}>
                  <td className="py-2 px-4 whitespace-nowrap text-card-foreground">{room.room_number}</td>
                  <td className="py-2 px-4 whitespace-nowrap text-card-foreground">{room.floor}</td>
                  <td className="py-2 px-4 whitespace-nowrap text-card-foreground">{room.room_types?.name}</td>
                  <td className="py-2 px-4 whitespace-nowrap text-card-foreground">${room.base_price}</td>
                  <td className="py-2 px-4 whitespace-nowrap">
                    {(() => {
                      const estadoEsp = estadoMap[normalize(room.status)] || normalize(room.status);
                      // Colores por estado adaptados a variables de tema
                      const colorMap = {
                        disponible: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                        ocupado: "bg-destructive text-destructive-foreground",
                        pendiente: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
                        "no disponible": "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
                        limpieza: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
                        mantenimiento: "bg-muted text-muted-foreground"
                      };
                      const color = colorMap[estadoEsp] || "bg-muted text-muted-foreground";
                      return (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>{estadoEsp.charAt(0).toUpperCase() + estadoEsp.slice(1)}</span>
                      );
                    })()}
                  </td>
                  <td className="py-2 px-4 whitespace-nowrap">
                    {room.is_active ? <span className="text-green-700 dark:text-green-300 font-bold">Sí</span> : <span className="text-destructive font-bold">No</span>}
                  </td>
                  <td className="py-2 px-4 whitespace-nowrap">
                    <div className="flex flex-row items-center gap-2">
                      <span className="inline-block"><DetailRoomButton onClick={() => { setSelectedRoom(room); setDetailOpen(true); }} /></span>
                      <span className="inline-block"><EditRoom token={token} room={room} roomTypes={roomTypes} onUpdated={loadRoomsAndTypes} rooms={rooms} /></span>
                      <span className="inline-block"><DeleteRoom token={token} roomId={room.id} roomNumber={room.room_number} onDeleted={loadRoomsAndTypes} /></span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <DetailRoom open={detailOpen} onClose={() => setDetailOpen(false)} room={selectedRoom} roomTypeName={selectedRoom?.room_types?.name} />
    </div>
  );
};

export default RoomsCrud;
