// Página principal para la administración de tipos de habitación
// Incluye CRUD completo, diseño moderno y responsivo, y validaciones
import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { fetchAdminRoomTypes } from "@/services/adminRooms";
import CreateRoomType from "../../components/AdminRoomTypes/CreateRoomType";
import EditRoomType from "../../components/AdminRoomTypes/EditRoomType";
import DeleteRoomType from "../../components/AdminRoomTypes/DeleteRoomType";
import DetailRoomType from "../../components/AdminRoomTypes/DetailRoomType";

// Componente principal para mostrar y gestionar los tipos de habitación
const RoomTypesCrud = () => {
  const { token } = useAuth();
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  // Función para recargar los tipos de habitación desde el backend
  const reloadRoomTypes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminRoomTypes(token);
      setRoomTypes(data);
    } catch (err) {
      setError(err?.message || "Error al cargar tipos de habitación");
    } finally {
      setLoading(false);
    }
  };

  // Recarga los datos al obtener el token (usuario autenticado)
  useEffect(() => {
    if (token) reloadRoomTypes();
    // eslint-disable-next-line
  }, [token]);

  // Filtrar y ordenar los tipos de habitación por nombre y id ascendente
  const filteredRoomTypes = roomTypes.filter(type =>
    type.name.toLowerCase().includes(search.trim().toLowerCase())
  );
  const sortedRoomTypes = [...filteredRoomTypes].sort((a, b) => a.id - b.id);

  // Render principal: tabla con diseño moderno y componentes CRUD
  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 md:px-8 py-4">
      {/* Card principal con sombra y bordes redondeados */}
      <div className="bg-card text-card-foreground rounded-2xl shadow-2xl p-4 md:p-8 mb-6 border border-input">
        {/* Botón para crear nuevo tipo y barra de búsqueda */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-6">
          <div className="w-full sm:w-auto flex items-center gap-2">
              <input
                type="text"
                placeholder="Buscar nombre de tipo habitación..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="border border-input rounded-lg px-3 py-2 bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition w-full sm:w-80"
              />
          </div>
          <CreateRoomType onCreated={reloadRoomTypes} />
        </div>
        {/* Estado de carga y error */}
        {loading ? (
          <p className="text-muted-foreground text-center text-lg py-8 animate-pulse">Cargando tipos de habitación...</p>
        ) : error ? (
          <p className="text-destructive text-center text-lg py-8">{error}</p>
        ) : (
          <div className="overflow-x-auto w-full">
            {/* Tabla responsiva con acciones CRUD */}
            <table className="min-w-full border-separate border-spacing-0 rounded-lg bg-card text-card-foreground shadow-lg">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  {/* Columnas principales */}
                  <th className="py-3 px-2 md:px-4 font-semibold text-left text-base md:text-lg tracking-wide rounded-tl-lg">Nombre</th>
                  <th className="py-3 px-2 md:px-4 font-semibold text-left text-base md:text-lg tracking-wide">Capacidad base</th>
                  <th className="py-3 px-2 md:px-4 font-semibold text-left text-base md:text-lg tracking-wide">Activo</th>
                  <th className="py-3 px-2 md:px-4 font-semibold text-left text-base md:text-lg tracking-wide rounded-tr-lg">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {/* Si no hay tipos, muestra mensaje */}
                {sortedRoomTypes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-muted-foreground">
                      No hay tipos de habitación registrados.
                    </td>
                  </tr>
                ) : (
                  // Renderiza cada tipo con acciones CRUD y diseño moderno
                  sortedRoomTypes.map((type) => (
                    <tr key={type.id} className="bg-secondary even:bg-card/80 transition-colors">
                      <td className="py-2 px-2 md:px-4 whitespace-nowrap text-card-foreground font-medium align-middle">{type.name}</td>
                      <td className="py-2 px-2 md:px-4 whitespace-nowrap text-card-foreground text-center align-middle">{type.base_capacity}</td>
                      <td className="py-2 px-2 md:px-4 whitespace-nowrap text-center align-middle">
                        {/* Badge de estado activo/inactivo */}
                        <span className={`px-2 py-1 rounded-full text-white text-xs md:text-sm font-semibold shadow ${type.is_active ? 'bg-green-500' : 'bg-red-500'}`}>{type.is_active ? 'Activo' : 'Inactivo'}</span>
                      </td>
                      <td className="py-2 px-2 md:px-4 whitespace-nowrap align-middle">
                        {/* Acciones: detalle, editar, eliminar */}
                        <div className="flex flex-col items-center gap-2 md:flex-row md:items-center md:justify-start">
                          <span className="inline-block w-full md:w-auto"><DetailRoomType roomType={type} /></span>
                          <span className="inline-block w-full md:w-auto"><EditRoomType roomType={type} onUpdated={reloadRoomTypes} /></span>
                          <span className="inline-block w-full md:w-auto"><DeleteRoomType roomTypeId={type.id} roomTypeName={type.name} onDeleted={reloadRoomTypes} /></span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomTypesCrud;
