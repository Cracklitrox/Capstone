import React, { useEffect, useState } from "react";
import { fetchAdminRooms, fetchAdminRoomTypes } from "../../services/adminRooms";
import { useAuth } from "../../services/authContext.jsx";
import CreateRoom from "../../components/AdminRooms/CreateRoom";
import EditRoom from "../../components/AdminRooms/EditRoom";
import DeleteRoom from "../../components/AdminRooms/DeleteRoom";

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
  // Colores por estado
  const estadoColor = {
    disponible: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    ocupado: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    pendiente: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    "no disponible": "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    limpieza: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    mantenimiento: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
  };
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
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-800">
        <h2 className="text-3xl font-bold mb-4 text-gray-800 dark:text-gray-100">Habitaciones</h2>
        {/* Selector de piso y filtros */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 w-full">
            {/* Selector de piso tipo paginación */}
            <div className="flex gap-2 mb-2 md:mb-0">
              {["1","2","3"].map(piso => (
                <button
                  key={piso}
                  className={`px-4 py-2 rounded font-semibold border transition-colors duration-200 ${activeFloor === piso ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900"}`}
                  onClick={() => setActiveFloor(piso)}
                >
                  Piso {piso}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-3 py-2 w-full md:w-1/3"
              placeholder="Buscar por número de habitación..."
              value={searchNumber}
              onChange={e => setSearchNumber(e.target.value.replace(/\D/g, ""))}
              maxLength={3}
            />
            <select
              className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-3 py-2 w-full md:w-1/4"
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
          <table className="min-w-full text-sm md:text-base border-separate border-spacing-0 rounded-lg bg-white dark:bg-gray-900">
            <thead>
              <tr className="bg-gradient-to-r from-blue-500 to-blue-700 text-white dark:from-blue-800 dark:to-blue-900">
                <th className="py-3 px-4 font-semibold text-left">Número</th>
                <th className="py-3 px-4 font-semibold text-left">Piso</th>
                <th className="py-3 px-4 font-semibold text-left">Tipo</th>
                <th className="py-3 px-4 font-semibold text-left">Precio Base</th>
                <th className="py-3 px-4 font-semibold text-left">Estado</th>
                <th className="py-3 px-4 font-semibold text-left">Activo</th>
                <th className="py-3 px-4 font-semibold text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((room, idx) => (
                <tr key={room.id} className={idx % 2 === 0 ? "bg-gray-50 dark:bg-gray-800" : "bg-white dark:bg-gray-900"}>
                  <td className="py-2 px-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{room.room_number}</td>
                  <td className="py-2 px-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{room.floor}</td>
                  <td className="py-2 px-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{room.room_types?.name}</td>
                  <td className="py-2 px-4 whitespace-nowrap text-gray-900 dark:text-gray-100">${room.base_price}</td>
                  <td className="py-2 px-4 whitespace-nowrap">
                    {(() => {
                      const estadoEsp = estadoMap[normalize(room.status)] || normalize(room.status);
                      const color = estadoColor[estadoEsp] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
                      return (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${color}`}>{estadoEsp.charAt(0).toUpperCase() + estadoEsp.slice(1)}</span>
                      );
                    })()}
                  </td>
                  <td className="py-2 px-4 whitespace-nowrap">
                    {room.is_active ? <span className="text-green-600 dark:text-green-400 font-bold">Sí</span> : <span className="text-red-600 dark:text-red-400 font-bold">No</span>}
                  </td>
                  <td className="py-2 px-4 whitespace-nowrap space-x-2 flex flex-wrap">
                    <EditRoom token={token} room={room} roomTypes={roomTypes} onUpdated={loadRoomsAndTypes} rooms={rooms} />
                    <DeleteRoom token={token} roomId={room.id} roomNumber={room.room_number} onDeleted={loadRoomsAndTypes} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RoomsCrud;
