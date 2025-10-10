import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import RoomCard from "./RoomCard.jsx";
import {
  fetchRooms,
  fetchRoomTypes,
  updateRoomStatus,
} from "../services/rooms.js";
import { fetchRoomDetails } from "../services/roomDetails.js";
import { useAuth } from "../services/authContext.jsx";
import { Button } from "@/components/ui/Button.jsx";
import { Card, CardContent } from "@/components/ui/Card.jsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select.jsx";
import { Input } from "@/components/ui/Input.jsx";
import { Label } from "@/components/ui/Label.jsx";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import RoomHistory from "./RoomHistory.jsx";
import {
  MaintenanceDetailView,
  CleaningDetailView,
  ReservationDetailView,
} from "./HistoryDetailViews.jsx";

const StatusSummary = ({ rooms }) => {
  const statusCounts = useMemo(
    () =>
      rooms.reduce((acc, room) => {
        const status = room.status || "unknown";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}),
    [rooms]
  );
  const summaryItems = [
    {
      label: "Disponibles",
      count: statusCounts.available,
      color: "text-green-500",
    },
    { label: "Ocupadas", count: statusCounts.occupied, color: "text-red-500" },
    {
      label: "Pendientes",
      count: statusCounts.pending,
      color: "text-orange-500",
    },
    { label: "Limpieza", count: statusCounts.cleaning, color: "text-blue-500" },
    {
      label: "Mantenimiento",
      count: statusCounts.maintenance,
      color: "text-slate-500",
    },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-sm font-medium text-muted-foreground mb-1">
            Total
          </p>
          <p className="text-2xl font-bold text-primary">{rooms.length}</p>
        </CardContent>
      </Card>
      {summaryItems.map((item) => (
        <Card key={item.label}>
          <CardContent className="pt-6 text-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {item.label}
            </p>
            <p className={`text-2xl font-bold ${item.color}`}>
              {item.count || 0}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

function RoomBoard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    searchTerm: "",
    selectedType: "Todos los tipos",
    selectedCapacity: "Cualquier capacidad",
    selectedFloor: "Todos los pisos",
    selectedStatus: "Todos los estados",
  });

  const [page, setPage] = useState(1);
  const CARDS_PER_PAGE = 12;

  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomDetails, setRoomDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  const [historyDetail, setHistoryDetail] = useState(null);

  const loadData = useCallback(
    async (isInitialLoad = false) => {
      if (!token) {
        setLoading(false);
        return;
      }
      if (isInitialLoad) setLoading(true);
      try {
        const [roomsData, typesData] = await Promise.all([
          fetchRooms(token),
          fetchRoomTypes(token),
        ]);
        setRooms(Array.isArray(roomsData) ? roomsData : []);
        setRoomTypes(Array.isArray(typesData) ? typesData : []);
      } catch (err) {
        setError(err?.message || "Error al cargar datos");
      } finally {
        if (isInitialLoad) setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const {
        searchTerm,
        selectedType,
        selectedCapacity,
        selectedFloor,
        selectedStatus,
      } = filters;
      const searchMatch = searchTerm ? r.number.includes(searchTerm) : true;
      const typeMatch =
        selectedType !== "Todos los tipos" ? r.type === selectedType : true;
      const capacityMatch =
        selectedCapacity !== "Cualquier capacidad"
          ? r.capacity >= parseInt(selectedCapacity)
          : true;
      const floorMatch =
        selectedFloor !== "Todos los pisos"
          ? String(r.floor) === selectedFloor
          : true;
      const statusMap = {
        Disponible: "available",
        Ocupado: "occupied",
        Limpieza: "cleaning",
        Mantenimiento: "maintenance",
        Pendiente: "pending",
      };
      const statusMatch =
        selectedStatus !== "Todos los estados"
          ? r.status === statusMap[selectedStatus]
          : true;
      return (
        searchMatch && typeMatch && capacityMatch && floorMatch && statusMatch
      );
    });
  }, [rooms, filters]);

  const pagedRooms = useMemo(() => {
    const start = (page - 1) * CARDS_PER_PAGE;
    return filteredRooms.slice(start, start + CARDS_PER_PAGE);
  }, [filteredRooms, page]);

  const totalPages = Math.ceil(filteredRooms.length / CARDS_PER_PAGE);

  // Verificar si los filtros están en su estado por defecto
  const isFiltersDefault = useMemo(() => {
    return (
      filters.searchTerm === "" &&
      filters.selectedType === "Todos los tipos" &&
      filters.selectedCapacity === "Cualquier capacidad" &&
      filters.selectedFloor === "Todos los pisos" &&
      filters.selectedStatus === "Todos los estados"
    );
  }, [filters]);

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
    setPage(1);
  };

  // Función para resetear todos los filtros
  const resetFilters = () => {
    setFilters({
      searchTerm: "",
      selectedType: "Todos los tipos",
      selectedCapacity: "Cualquier capacidad",
      selectedFloor: "Todos los pisos",
      selectedStatus: "Todos los estados",
    });
    setPage(1);
  };

  const handleStatusChange = async (roomId, newStatus) => {
    const originalRooms = [...rooms];
    setRooms((currentRooms) =>
      currentRooms.map((r) =>
        r.id === roomId ? { ...r, status: newStatus } : r
      )
    );
    try {
      await updateRoomStatus(roomId, newStatus, token);
    } catch (error) {
      console.error("Fallo al actualizar estado:", error);
      setRooms(originalRooms);
    }
  };

  const handleCheckIn = (roomId, reservationId) => {
    console.log(
      `Realizando Check-in para Habitación ${roomId}, Reserva ${reservationId}`
    );
    handleStatusChange(roomId, "occupied");
  };

  const handleCheckOut = (roomId, reservationId) => {
    console.log(
      `Realizando Check-out para Habitación ${roomId}, Reserva ${reservationId}`
    );
    handleStatusChange(roomId, "cleaning");
  };

  const openDetails = async (room) => {
    setSelectedRoom(room);
    setDetailsLoading(true);
    setDetailsError(null);
    setHistoryDetail(null);
    try {
      const details = await fetchRoomDetails(room.id, token);
      setRoomDetails(details);
    } catch (err) {
      setDetailsError(err?.message || "Error al cargar detalles");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setSelectedRoom(null);
    setHistoryDetail(null);
  };

  const handleShowHistoryDetail = (type, data) => {
    setHistoryDetail({ type, data });
  };

  const handleCloseHistoryDetail = () => {
    setHistoryDetail(null);
  };

  const typeOptions = useMemo(
    () => ["Todos los tipos", ...roomTypes.map((rt) => rt.name)],
    [roomTypes]
  );
  const capacityOptions = ["Cualquier capacidad", "1", "2", "3", "4", "5+"];
  const floorOptions = useMemo(
    () => ["Todos los pisos", ...new Set(rooms.map((r) => String(r.floor)))],
    [rooms]
  );
  const statusOptions = [
    "Todos los estados",
    "Disponible",
    "Ocupado",
    "Limpieza",
    "Mantenimiento",
    "Pendiente",
  ];

  const renderDialogContent = () => {
    if (historyDetail) {
      switch (historyDetail.type) {
        case "maintenance":
          return (
            <MaintenanceDetailView
              item={historyDetail.data}
              onBack={handleCloseHistoryDetail}
            />
          );
        case "cleaning":
          return (
            <CleaningDetailView
              item={historyDetail.data}
              onBack={handleCloseHistoryDetail}
            />
          );
        case "reservation":
          return (
            <ReservationDetailView
              item={historyDetail.data}
              onBack={handleCloseHistoryDetail}
            />
          );
        default:
          return null;
      }
    }
    if (detailsLoading)
      return (
        <p className="text-center text-muted-foreground py-8">
          Cargando detalles...
        </p>
      );
    if (detailsError)
      return (
        <p className="text-destructive text-center py-8">{detailsError}</p>
      );
    if (roomDetails) {
      return (
        <RoomHistory
          roomDetails={roomDetails}
          onShowDetail={handleShowHistoryDetail}
        />
      );
    }
    return null;
  };

  if (loading)
    return <p className="text-muted-foreground">Cargando habitaciones...</p>;
  if (error) return <p className="text-destructive">Error: {error}</p>;

  return (
    <div className="space-y-6">
      <StatusSummary rooms={rooms} />
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Label htmlFor="search-room" className="sr-only">
                Buscar Habitación
              </Label>
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="search-room"
                placeholder="Buscar por Nº Hab..."
                className="pl-10"
                value={filters.searchTerm}
                onChange={(e) =>
                  handleFilterChange("searchTerm", e.target.value)
                }
              />
            </div>
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
                value={filters.selectedCapacity}
                onValueChange={(value) =>
                  handleFilterChange("selectedCapacity", value)
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Capacidad..." />
                </SelectTrigger>
                <SelectContent>
                  {capacityOptions.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o === "5+" ? "5 o más" : `${o} pers.`}
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
                      {o}
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {pagedRooms.length > 0 ? (
          pagedRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onDetails={openDetails}
              onStatusChange={handleStatusChange}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
            />
          ))
        ) : (
          <Card className="col-span-full text-center py-16">
            <p className="font-semibold text-foreground">
              No se encontraron habitaciones
            </p>
            <p className="text-sm text-muted-foreground">
              Intenta ajustar los filtros de búsqueda.
            </p>
          </Card>
        )}
      </div>
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
      <Dialog
        open={!!selectedRoom}
        onOpenChange={(isOpen) => !isOpen && handleCloseDialog()}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {historyDetail
                ? `Detalle de ${historyDetail.type}`
                : `Detalles de la Habitación ${selectedRoom?.number}`}
            </DialogTitle>
            {!historyDetail && (
              <DialogDescription>
                {roomDetails?.type} - Capacidad para {roomDetails?.capacity}{" "}
                personas
              </DialogDescription>
            )}
          </DialogHeader>

          {renderDialogContent()}

          {!historyDetail && (
            <DialogFooter className="mt-4 sm:justify-between">
              <Button variant="secondary" onClick={handleCloseDialog}>
                Cerrar
              </Button>
              <div className="flex gap-2 mt-2 sm:mt-0">
                {roomDetails?.currentGuest && <Button>Ver Reserva</Button>}
                {roomDetails?.status === "available" && (
                  <Button
                    onClick={() =>
                      navigate(`/reservations/new?roomId=${selectedRoom?.id}`)
                    }
                  >
                    Agendar Reserva
                  </Button>
                )}
              </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RoomBoard;
