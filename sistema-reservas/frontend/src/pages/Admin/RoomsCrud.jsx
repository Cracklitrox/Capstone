import React, { useEffect, useState, useMemo } from "react";
import {
  fetchAdminRooms,
  fetchAdminRoomTypes,
} from "../../services/adminRooms";
import { useAuth } from "../../services/authContext.jsx";
import CreateRoom from "../../components/AdminRooms/CreateRoom";
import EditRoom from "../../components/AdminRooms/EditRoom";
import DeleteRoom from "../../components/AdminRooms/DeleteRoom";
import DetailRoom from "../../components/AdminRooms/DetailRoom";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  BuildingOfficeIcon,
  UsersIcon,
  CurrencyDollarIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";

const RoomsCrud = () => {
  const { token } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [filters, setFilters] = useState({
    searchNumber: "",
    selectedType: "Todos los tipos",
    selectedFloor: "Todos los pisos",
    selectedStatus: "Todos los estados",
  });

  // Paginación
  const [page, setPage] = useState(1);
  const CARDS_PER_PAGE = 12;

  // Modal de detalle
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
  }, [token]);

  // Mapeo de estados
  const estadoMap = {
    available: "disponible",
    occupied: "ocupado",
    pending: "pendiente",
    unavailable: "no disponible",
    cleaning: "limpieza",
    maintenance: "mantenimiento",
  };

  // Función para normalizar strings
  const normalize = (str) =>
    str
      ?.toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ")
      .trim();

  // Filtrado
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const { searchNumber, selectedType, selectedFloor, selectedStatus } =
        filters;

      const searchMatch = searchNumber
        ? String(room.room_number).includes(searchNumber)
        : true;

      const typeMatch =
        selectedType !== "Todos los tipos"
          ? room.room_types?.name === selectedType
          : true;

      const floorMatch =
        selectedFloor !== "Todos los pisos"
          ? String(room.floor) === selectedFloor
          : true;

      const estadoRoom =
        estadoMap[normalize(room.status)] || normalize(room.status);
      const estadoFiltro =
        selectedStatus !== "Todos los estados" ? normalize(selectedStatus) : "";
      const statusMatch =
        selectedStatus === "Todos los estados" || estadoRoom === estadoFiltro;

      return searchMatch && typeMatch && floorMatch && statusMatch;
    });
  }, [rooms, filters]);

  // Paginación
  const pagedRooms = useMemo(() => {
    const start = (page - 1) * CARDS_PER_PAGE;
    return filteredRooms.slice(start, start + CARDS_PER_PAGE);
  }, [filteredRooms, page]);

  const totalPages = Math.ceil(filteredRooms.length / CARDS_PER_PAGE);

  // Verificar si filtros están por defecto
  const isFiltersDefault = useMemo(() => {
    return (
      filters.searchNumber === "" &&
      filters.selectedType === "Todos los tipos" &&
      filters.selectedFloor === "Todos los pisos" &&
      filters.selectedStatus === "Todos los estados"
    );
  }, [filters]);

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      searchNumber: "",
      selectedType: "Todos los tipos",
      selectedFloor: "Todos los pisos",
      selectedStatus: "Todos los estados",
    });
    setPage(1);
  };

  const handleOpenDetail = (room) => {
    setSelectedRoom(room);
    setDetailOpen(true);
  };

  // Opciones para filtros
  const typeOptions = useMemo(
    () => ["Todos los tipos", ...roomTypes.map((rt) => rt.name)],
    [roomTypes]
  );

  const floorOptions = useMemo(
    () => ["Todos los pisos", ...new Set(rooms.map((r) => String(r.floor)))],
    [rooms]
  );

  const statusOptions = [
    "Todos los estados",
    "disponible",
    "ocupado",
    "pendiente",
    "limpieza",
    "mantenimiento",
  ];

  // Variantes de badges por estado
  const statusVariants = {
    disponible: "success",
    ocupado: "destructive",
    limpieza: "info",
    mantenimiento: "secondary",
    pendiente: "warning",
    "no disponible": "secondary",
  };

  if (loading)
    return <p className="text-muted-foreground">Cargando habitaciones...</p>;
  if (error) return <p className="text-destructive">Error: {error}</p>;

  return (
    <div className="space-y-6">
      {/* Header con título y botón crear */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Gestión de Habitaciones
          </h1>
          <p className="text-muted-foreground">
            Administra todas las habitaciones del hotel
          </p>
        </div>
        <CreateRoom
          token={token}
          roomTypes={roomTypes}
          onCreated={loadRoomsAndTypes}
        />
      </div>

      {/* Tarjeta de filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            {/* Búsqueda por número */}
            <div className="relative flex-1 min-w-[200px]">
              <Label htmlFor="search-number" className="sr-only">
                Buscar por Número
              </Label>
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="search-number"
                placeholder="Buscar por Nº Habitación..."
                className="pl-10"
                value={filters.searchNumber}
                onChange={(e) =>
                  handleFilterChange(
                    "searchNumber",
                    e.target.value.replace(/\D/g, "")
                  )
                }
                maxLength={3}
              />
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={filters.selectedType}
                onValueChange={(value) =>
                  handleFilterChange("selectedType", value)
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.selectedFloor}
                onValueChange={(value) =>
                  handleFilterChange("selectedFloor", value)
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Piso..." />
                </SelectTrigger>
                <SelectContent>
                  {floorOptions.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.selectedStatus}
                onValueChange={(value) =>
                  handleFilterChange("selectedStatus", value)
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Estado..." />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o.charAt(0).toUpperCase() + o.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={resetFilters}
                disabled={isFiltersDefault}
                className="w-full sm:w-auto"
              >
                <XMarkIcon className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {pagedRooms.length > 0 ? (
          pagedRooms.map((room) => {
            const estadoEsp =
              estadoMap[normalize(room.status)] || normalize(room.status);
            const variant = statusVariants[estadoEsp] || "secondary";

            return (
              <Card
                key={room.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleOpenDetail(room)}
              >
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Header con número y estado */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <HomeIcon className="h-5 w-5 text-primary" />
                          <h3 className="text-2xl font-bold text-foreground">
                            {room.room_number}
                          </h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {room.room_types?.name || "Sin tipo"}
                        </p>
                      </div>
                      <Badge variant={variant}>
                        {estadoEsp.charAt(0).toUpperCase() + estadoEsp.slice(1)}
                      </Badge>
                    </div>

                    {/* Información de la habitación */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BuildingOfficeIcon className="h-4 w-4" />
                        <span>Piso {room.floor}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <UsersIcon className="h-4 w-4" />
                        <span>Capacidad: {room.capacity} personas</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CurrencyDollarIcon className="h-4 w-4" />
                        <span className="font-semibold text-foreground">
                          ${room.base_price?.toLocaleString("es-CL")}
                        </span>
                      </div>
                    </div>

                    {/* Estado activo/inactivo */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Estado:
                      </span>
                      <Badge
                        variant={room.is_active ? "success" : "destructive"}
                      >
                        {room.is_active ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>

                    {/* Botones de acción */}
                    <div
                      className="flex gap-2 pt-2 border-t"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <EditRoom
                        token={token}
                        room={room}
                        roomTypes={roomTypes}
                        onUpdated={loadRoomsAndTypes}
                        rooms={rooms}
                      />
                      <DeleteRoom
                        token={token}
                        roomId={room.id}
                        roomNumber={room.room_number}
                        roomStatus={estadoEsp}
                        onDeleted={loadRoomsAndTypes}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="col-span-full text-center py-16">
            <CardContent>
              <p className="font-semibold text-foreground">
                No se encontraron habitaciones
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Intenta ajustar los filtros de búsqueda.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm font-semibold text-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* Modal de detalle */}
      <DetailRoom
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        room={selectedRoom}
        roomTypeName={selectedRoom?.room_types?.name}
      />
    </div>
  );
};

export default RoomsCrud;
