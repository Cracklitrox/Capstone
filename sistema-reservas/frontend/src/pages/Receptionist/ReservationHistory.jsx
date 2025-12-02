import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  getReservationHistory,
  getReservationDetailsById,
} from "@/services/reservation_history.js";
import { fetchRooms } from "@/services/rooms.js";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Badge } from "../../components/ui/Badge";
import { Progress } from "../../components/ui/Progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/Select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/Dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/Popover";
import { Calendar } from "../../components/ui/Calendar";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  CalendarIcon,
  UserIcon,
  HomeIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  MoonIcon,
  UsersIcon,
  HashtagIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { ReservationDetailView } from "@/components/rooms/HistoryDetailViews";

const ReservationHistory = () => {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [history, setHistory] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allRooms, setAllRooms] = useState([]);
  const isInitialMount = useRef(true);

  // Filtros
  const [filters, setFilters] = useState({
    rut: "",
    floor: "",
    roomId: "",
    startDate: null,
    endDate: null,
    reservation: "", // Para filtrar por código de reserva desde la URL
    guest: "", // Para filtrar por RUT de huésped desde la URL
  });

  // Modal de detalle
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // Cargar habitaciones para filtros
  useEffect(() => {
    if (token) {
      fetchRooms(token)
        .then(setAllRooms)
    }
  }, [token]);

  // Pisos disponibles
  const availableFloors = useMemo(() => {
    if (!allRooms.length) return [];
    return Array.from(new Set(allRooms.map((room) => room.floor))).sort(
      (a, b) => a - b
    );
  }, [allRooms]);

  // Fetch historial
  const fetchHistory = useCallback(
    async (page = 1, currentFilters) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const apiFilters = {
          page,
          rut: currentFilters.rut || undefined,
          roomId:
            currentFilters.roomId && !isNaN(currentFilters.roomId)
              ? Number(currentFilters.roomId)
              : undefined,
          floor: currentFilters.floor || undefined,
          startDate: currentFilters.startDate
            ? format(currentFilters.startDate, "yyyy-MM-dd")
            : undefined,
          endDate: currentFilters.endDate
            ? format(currentFilters.endDate, "yyyy-MM-dd")
            : undefined,
          guest: currentFilters.guest || undefined,
          reservation: currentFilters.reservation || undefined,
        };
        const response = await getReservationHistory(apiFilters, token);
        setHistory(response.data || []);
        setMeta(response.meta || { page: 1, totalPages: 1 });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  // Efecto para leer los parámetros de la URL al cargar la página
  useEffect(() => {
    const guestParam = searchParams.get("guest");
    const reservationParam = searchParams.get("reservation");

    // Solo se ejecuta si hay parámetros en la URL
    if (guestParam || reservationParam) {
      const initialFilters = {
        ...filters,
        guest: guestParam || "",
        reservation: reservationParam || "",
        rut: guestParam || "", // Rellena el input de RUT si viene el parámetro
      };
      setFilters(initialFilters);
      fetchHistory(1, initialFilters);
      // Limpiamos los parámetros de la URL para que no interfieran con filtros manuales
      setSearchParams({});
    } else {
      // Si no hay parámetros, carga el historial general
      fetchHistory(1, filters);
    }
  }, []); // Se ejecuta solo una vez

  // Debounce para filtros manuales del usuario
  useEffect(() => {
    // Evita que se ejecute en la carga inicial
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const handler = setTimeout(() => {
      fetchHistory(1, filters);
    }, 500);

    return () => clearTimeout(handler);
  }, [
    filters.rut,
    filters.floor,
    filters.roomId,
    filters.startDate,
    filters.endDate,
  ]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      // Limpiamos los filtros de URL si el usuario interactúa manualmente
      guest: "",
      reservation: "",
    }));
  };

  const resetFilters = () => {
    const clearedFilters = {
      rut: "",
      floor: "",
      roomId: "",
      startDate: null,
      endDate: null,
      guest: "",
      reservation: "",
    };
    setFilters(clearedFilters);
    fetchHistory(1, clearedFilters);
  };

  const isFiltersDefault = useMemo(() => {
    return (
      filters.rut === "" &&
      filters.floor === "" &&
      filters.roomId === "" &&
      filters.startDate === null &&
      filters.endDate === null
    );
  }, [filters]);

  const handleViewDetails = async (reservationId) => {
    setIsModalOpen(true);
    setModalLoading(true);
    try {
      const details = await getReservationDetailsById(reservationId, token);
      setSelectedReservation(details);
    } catch (err) {
      setError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= meta.totalPages) {
      fetchHistory(newPage, filters);
    }
  };

  const channelLabels = {
    chatbot: "ChatBot/WhatsApp",
    reception: "Llamada Telefónica",
    in_person: "Presencial con Cita",
    walk_in: "Walk-in",
    web: "Web",
  };

  const channelVariants = {
    chatbot: "info",
    reception: "secondary",
    in_person: "default",
    walk_in: "warning",
    web: "success",
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(amount);
  };

  const getServiceIcon = (serviceName) => {
    const name = serviceName.toLowerCase();
    if (name.includes("desayuno") || name.includes("comida")) return "🍽️";
    if (name.includes("lavandería") || name.includes("lavado")) return "🧺";
    if (name.includes("transporte") || name.includes("taxi")) return "🚗";
    if (name.includes("spa") || name.includes("masaje")) return "💆";
    return "🛎️";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Historial de Reservas
        </h1>
        <p className="text-muted-foreground">
          Consulta todas las reservas completadas del hotel
        </p>
      </div>

      {/* Tarjeta de filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            {/* Búsqueda por RUT */}
            <div className="relative flex-1 min-w-[200px]">
              <Label htmlFor="search-rut" className="sr-only">
                Buscar por RUT
              </Label>
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="search-rut"
                placeholder="Buscar por RUT o Pasaporte..."
                className="pl-10"
                value={filters.rut}
                onChange={(e) => handleFilterChange("rut", e.target.value)}
              />
            </div>

            {/* Filtros adicionales */}
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={filters.floor}
                onValueChange={(value) =>
                  handleFilterChange("floor", value === "all" ? "" : value)
                }
              >
                <SelectTrigger className="w-full sm:w-[150px]" aria-label="Filtrar por piso">
                  <SelectValue placeholder="Piso..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los pisos</SelectItem>
                  {availableFloors.map((f) => (
                    <SelectItem key={f} value={String(f)}>
                      Piso {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Nº Habitación"
                className="w-full sm:w-[150px]"
                value={filters.roomId}
                onChange={(e) => handleFilterChange("roomId", e.target.value)}
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full sm:w-[180px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.startDate ? (
                      format(filters.startDate, "PPP", { locale: es })
                    ) : (
                      <span className="text-muted-foreground">Desde...</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => handleFilterChange("startDate", date)}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full sm:w-[180px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.endDate ? (
                      format(filters.endDate, "PPP", { locale: es })
                    ) : (
                      <span className="text-muted-foreground">Hasta...</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => handleFilterChange("endDate", date)}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
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

      {/* Estados de carga y Grid de cards */}
      {loading ? (
        <p className="text-center text-muted-foreground py-10">
          Cargando historial...
        </p>
      ) : error ? (
        <p className="text-center text-destructive py-10">{error}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.length > 0 ? (
              history.map((item) => {
                const paymentProgress =
                  item.total_amount > 0
                    ? Math.min((item.paid_amount / item.total_amount) * 100, 100)
                    : 0;
                const statusBadgeVariant =
                  {
                    completed: "success",
                    confirmed: "default",
                    in_progress: "info",
                    pending: "secondary",
                    canceled: "destructive",
                    no_show: "destructive",
                  }[item.status] || "secondary";

                return (
                  <Card
                    key={item.reservation_id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <HashtagIcon className="h-4 w-4 text-primary" />
                              <h2 className="text-lg font-bold text-foreground">
                                {item.code}
                              </h2>
                            </div>
                            <Badge
                              variant={
                                channelVariants[item.channel] || "secondary"
                              }
                              className="text-xs"
                            >
                              {channelLabels[item.channel] || item.channel}
                            </Badge>
                          </div>
                          <Badge variant={statusBadgeVariant}>
                            {item.status}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {item.nombre_cliente}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground ml-6">
                            {item.identification_number}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <HomeIcon className="h-4 w-4 text-muted-foreground" />
                            <span>Hab. {item.habitacion_reservada}</span>
                            <Badge variant="outline" className="text-xs">
                              {item.room_type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <UsersIcon className="h-4 w-4" />
                            <span className="text-xs">{item.guest_count}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MoonIcon className="h-4 w-4" />
                          <span>
                            {item.nights}{" "}
                            {item.nights === 1 ? "noche" : "noches"}
                          </span>
                          <ClockIcon className="h-4 w-4 ml-2" />
                          <span className="text-xs">
                            {format(parseISO(item.check_in_date), "dd/MM/yy")} -{" "}
                            {format(parseISO(item.check_out_date), "dd/MM/yy")}
                          </span>
                        </div>
                        {item.services && item.services.length > 0 && (
                          <div className="flex items-center gap-2">
                            <ShoppingBagIcon className="h-4 w-4 text-muted-foreground" />
                            <div className="flex items-center gap-1 flex-wrap">
                              {item.services.map((service, idx) => (
                                <span
                                  key={idx}
                                  className="text-lg"
                                  title={`${service.name} (x${service.quantity})`}
                                >
                                  {getServiceIcon(service.name)}
                                </span>
                              ))}
                              {item.total_services > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{item.total_services - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <CurrencyDollarIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {formatCurrency(item.paid_amount)}
                              </span>
                              <span className="text-muted-foreground">
                                / {formatCurrency(item.total_amount)}
                              </span>
                            </div>
                            <span
                              className={`text-xs font-semibold ${paymentProgress === 100
                                  ? "text-green-700 dark:text-green-400"
                                  : "text-orange-700 dark:text-orange-400"
                                }`}
                            >
                              {paymentProgress.toFixed(0)}%
                            </span>
                          </div>
                          <Progress
                            value={paymentProgress}
                            className="h-2"
                            aria-label={`Progreso de pago: ${paymentProgress.toFixed(0)}%`}
                          />
                        </div>
                        <Button
                          variant="outline"
                          className="w-full"
                          size="sm"
                          onClick={() => handleViewDetails(item.reservation_id)}
                        >
                          Ver detalles completos
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card className="col-span-full text-center py-16">
                <CardContent>
                  <p className="font-semibold text-foreground">
                    No se encontraron reservas
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Prueba a cambiar los filtros o a limpiar la búsqueda.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {meta.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page <= 1 || loading}
                onClick={() => handlePageChange(meta.page - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm font-semibold text-foreground">
                Página {meta.page} de {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page >= meta.totalPages || loading}
                onClick={() => handlePageChange(meta.page + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}

      {/* Modal de detalles */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la Reserva</DialogTitle>
            <DialogDescription>
              {selectedReservation
                ? `Reserva #${selectedReservation.code}`
                : "Cargando..."}
            </DialogDescription>
          </DialogHeader>
          {modalLoading ? (
            <p className="text-center p-8 text-muted-foreground">
              Cargando detalles...
            </p>
          ) : error && isModalOpen ? (
            <p className="text-center text-destructive p-8">{error}</p>
          ) : (
            selectedReservation && (
              <ReservationDetailView
                item={{
                  code: selectedReservation.code,
                  guestName: `${selectedReservation.users_reservations_main_guest_idTousers.first_name} ${selectedReservation.users_reservations_main_guest_idTousers.paternal_last_name}`,
                  guestIdentification:
                    selectedReservation.users_reservations_main_guest_idTousers
                      .identification_number,
                  guestEmail:
                    selectedReservation.users_reservations_main_guest_idTousers
                      .email,
                  guestPhone:
                    selectedReservation.users_reservations_main_guest_idTousers
                      .phone_number,
                  checkIn: selectedReservation.check_in_date,
                  checkOut: selectedReservation.check_out_date,
                  guestCount: selectedReservation.guest_count,
                  totalAmount: selectedReservation.total_amount,
                  paidAmount: selectedReservation.paid_amount,
                  rooms: selectedReservation.reservation_rooms.map((rr) => ({
                    number: rr.rooms.room_number,
                    type: rr.rooms.room_types.name,
                  })),
                  services: selectedReservation.reservation_services.map(
                    (rs) => ({
                      name: rs.services.name,
                      quantity: rs.quantity,
                      unitPrice: rs.unit_price,
                    })
                  ),
                  payments: selectedReservation.payments.map((p) => ({
                    method: p.payment_method,
                    status: p.status,
                    amount: p.amount,
                  })),
                }}
                onBack={() => setIsModalOpen(false)}
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReservationHistory;
