import React, { useState, useEffect, useMemo } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/Card";
import { fetchAdminRoomTypes } from "@/services/adminRooms";
import CreateRoomType from "../../components/rooms/admin/AdminRoomTypes/CreateRoomType";
import EditRoomType from "../../components/rooms/admin/AdminRoomTypes/EditRoomType";
import DeleteRoomType from "../../components/rooms/admin/AdminRoomTypes/DeleteRoomType";
import DetailRoomType from "../../components/rooms/admin/AdminRoomTypes/DetailRoomType";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Badge } from "../../components/ui/Badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/Select";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  TagIcon,
  UsersIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

const RoomTypesCrud = () => {
  const { token } = useAuth();
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [filters, setFilters] = useState({
    searchName: "",
    selectedStatus: "Todos los estados",
  });

  // Paginación
  const [page, setPage] = useState(1);
  const CARDS_PER_PAGE = 12;

  // Modal de detalle
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(null);

  const reloadRoomTypes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminRoomTypes();
      setRoomTypes(data);
    } catch (err) {
      setError(err?.message || "Error al cargar tipos de habitación");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) reloadRoomTypes();
    // eslint-disable-next-line
  }, [token]);

  // Filtrado
  const filteredRoomTypes = useMemo(() => {
    return roomTypes.filter((type) => {
      const { searchName, selectedStatus } = filters;

      const nameMatch = searchName
        ? type.name.toLowerCase().includes(searchName.toLowerCase())
        : true;

      const statusMatch =
        selectedStatus === "Todos los estados"
          ? true
          : selectedStatus === "Activo"
            ? type.is_active
            : !type.is_active;

      return nameMatch && statusMatch;
    });
  }, [roomTypes, filters]);

  // Paginación
  const pagedRoomTypes = useMemo(() => {
    const start = (page - 1) * CARDS_PER_PAGE;
    return filteredRoomTypes.slice(start, start + CARDS_PER_PAGE);
  }, [filteredRoomTypes, page]);

  const totalPages = Math.ceil(filteredRoomTypes.length / CARDS_PER_PAGE);

  // Verificar si filtros están por defecto
  const isFiltersDefault = useMemo(() => {
    return (
      filters.searchName === "" &&
      filters.selectedStatus === "Todos los estados"
    );
  }, [filters]);

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      searchName: "",
      selectedStatus: "Todos los estados",
    });
    setPage(1);
  };

  const handleOpenDetail = (type) => {
    setSelectedType(type);
    setDetailOpen(true);
  };

  if (loading)
    return (
      <p className="text-muted-foreground text-center text-lg py-8">
        Cargando tipos de habitación...
      </p>
    );
  if (error)
    return <p className="text-destructive text-center text-lg py-8">{error}</p>;

  return (
    <div className="space-y-6">
      {/* Header con título y botón crear */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Gestión de Tipos de Habitación
          </h1>
          <p className="text-muted-foreground">
            Administra los tipos de habitaciones del hotel
          </p>
        </div>
        <CreateRoomType onCreated={reloadRoomTypes} roomTypes={roomTypes} />
      </div>

      {/* Tarjeta de filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            {/* Búsqueda por nombre */}
            <div className="relative flex-1 min-w-[200px]">
              <Label htmlFor="search-name" className="sr-only">
                Buscar por Nombre
              </Label>
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="search-name"
                placeholder="Buscar por nombre..."
                className="pl-10"
                value={filters.searchName}
                onChange={(e) =>
                  handleFilterChange("searchName", e.target.value)
                }
                maxLength={30}
              />
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={filters.selectedStatus}
                onValueChange={(value) =>
                  handleFilterChange("selectedStatus", value)
                }
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Estado..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos los estados">
                    Todos los estados
                  </SelectItem>
                  <SelectItem value="Activo">Activos</SelectItem>
                  <SelectItem value="Inactivo">Inactivos</SelectItem>
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
        {pagedRoomTypes.length > 0 ? (
          pagedRoomTypes.map((type) => (
            <Card
              key={type.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleOpenDetail(type)}
            >
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Header con nombre y estado */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <TagIcon className="h-5 w-5 text-primary" />
                        <h3 className="text-2xl font-bold text-foreground">
                          {type.name}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ID: #{type.id}
                      </p>
                    </div>
                    <Badge variant={type.is_active ? "success" : "destructive"}>
                      {type.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>

                  {/* Información del tipo */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <UsersIcon className="h-4 w-4" />
                      <span>
                        Capacidad base: {type.base_capacity}{" "}
                        {type.base_capacity === 1 ? "persona" : "personas"}
                      </span>
                    </div>
                    {type.description && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground">
                        <DocumentTextIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{type.description}</span>
                      </div>
                    )}
                  </div>

                  {/* Botones de acción */}
                  <div
                    className="flex gap-2 pt-2 border-t"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <EditRoomType roomType={type} onUpdated={reloadRoomTypes} />
                    <DeleteRoomType
                      roomTypeId={type.id}
                      roomTypeName={type.name}
                      onDeleted={reloadRoomTypes}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full text-center py-16">
            <CardContent>
              <p className="font-semibold text-foreground">
                No se encontraron tipos de habitación
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
      <DetailRoomType
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        roomType={selectedType}
      />
    </div>
  );
};

export default RoomTypesCrud;
