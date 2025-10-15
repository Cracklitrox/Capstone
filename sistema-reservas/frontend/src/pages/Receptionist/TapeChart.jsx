import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApiCache } from "@/hooks/useApiCache";
import { getPlanningData } from "@/services/planning";
import { fetchRooms, fetchRoomTypes } from "@/services/rooms";
import {
  addDays,
  subDays,
  format,
  eachDayOfInterval,
  isWithinInterval,
  startOfDay,
  differenceInDays,
  max,
  min,
  isToday,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/Button";
import { Calendar } from "@/components/ui/Calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/Dialog.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import ReservationDetailsModal from "@/components/ReservationDetailsModal";
import { cn } from "@/lib/utils";

// 🎨 COLORES DE ESTADOS
const statusStyles = {
  pending: {
    label: "Pendiente",
    color: "bg-amber-400 border-amber-500",
  },
  confirmed: {
    label: "Confirmada",
    color: "bg-blue-500 border-blue-600",
  },
  in_progress: {
    label: "En Curso",
    color: "bg-green-600 border-green-700",
  },
};

// 🏷️ CANALES
const channelLabels = {
  chatbot: "ChatBot/WhatsApp",
  reception: "Llamada",
  in_person: "Presencial",
  walk_in: "Walk-in",
  web: "Web",
};

// 🎯 EMOJIS DE SERVICIOS
const serviceEmojis = {
  desayuno: "🍳",
  lavanderia: "🧺",
  lavandería: "🧺",
  estacionamiento: "🅿️",
  wifi: "📶",
  minibar: "🍷",
};

function TapeChart() {
  const { token } = useAuth();
  const { cachedFetch } = useApiCache(5000); // 5 segundos de caché

  const [dateRange, setDateRange] = useState({
    from: startOfDay(new Date()),
    to: startOfDay(addDays(new Date(), 14)),
  });

  const [allRooms, setAllRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [planningData, setPlanningData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ type: "all", floor: "all" });
  const [selectedReservation, setSelectedReservation] = useState(null);

  // 📅 NAVEGACIÓN
  const setQuickRange = (days) => {
    const newStart = startOfDay(new Date());
    const newEnd = startOfDay(addDays(new Date(), days - 1));
    setDateRange({ from: newStart, to: newEnd });
  };

  const goToToday = () => setQuickRange(14);

  const goToPreviousWeek = () => {
    setDateRange((prev) => ({
      from: subDays(prev.from, 7),
      to: subDays(prev.to, 7),
    }));
  };

  const goToNextWeek = () => {
    setDateRange((prev) => ({
      from: addDays(prev.from, 7),
      to: addDays(prev.to, 7),
    }));
  };

  const handleStartDateSelect = (newStartDate) => {
    if (!newStartDate) return;
    const newStart = startOfDay(newStartDate);
    if (newStart > dateRange.to) {
      setDateRange({ from: newStart, to: newStart });
    } else {
      setDateRange((prev) => ({ ...prev, from: newStart }));
    }
  };

  const handleEndDateSelect = (newEndDate) => {
    if (!newEndDate) return;
    setDateRange((prev) => ({ ...prev, to: startOfDay(newEndDate) }));
  };

  // 📊 CARGAR DATOS
  useEffect(() => {
    if (token) {
      setLoading(true);
      Promise.all([
        cachedFetch('rooms-list', () => fetchRooms(token)),
        cachedFetch('room-types', () => fetchRoomTypes(token))
      ])
        .then(([rooms, types]) => {
          setAllRooms(rooms.sort((a, b) => a.number.localeCompare(b.number)));
          setRoomTypes(types);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [token, cachedFetch]);
  useEffect(() => {
    if (token && dateRange.from && dateRange.to && allRooms.length > 0) {
      setLoading(true);
      getPlanningData(dateRange.from, dateRange.to, token)
        .then((response) => {
          setPlanningData(response.rooms || []);
          setStats(response.stats || null);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [token, dateRange, allRooms]);

  const filteredRooms = useMemo(
    () =>
      allRooms.filter((room) => {
        const typeMatch = filters.type === "all" || room.type === filters.type;
        const floorMatch =
          filters.floor === "all" || String(room.floor) === filters.floor;
        return typeMatch && floorMatch;
      }),
    [allRooms, filters]
  );

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const floorOptions = useMemo(
    () => ["all", ...new Set(allRooms.map((r) => String(r.floor)))],
    [allRooms]
  );

  const daysInInterval = useMemo(
    () =>
      dateRange.from && dateRange.to
        ? eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
        : [],
    [dateRange]
  );

  const reservationsByRoomId = useMemo(
    () =>
      planningData.reduce((acc, room) => {
        acc[room.roomId] = room.reservations;
        return acc;
      }, {}),
    [planningData]
  );

  // 🎨 RENDERIZAR FILA
  const renderRoomRow = (room) => {
    const reservations = reservationsByRoomId[room.id] || [];
    const cells = [];
    let dayIndex = 0;

    while (dayIndex < daysInInterval.length) {
      const currentDay = daysInInterval[dayIndex];
      const isTodayCell = isToday(currentDay);

      const reservation = reservations.find((r) =>
        isWithinInterval(currentDay, {
          start: startOfDay(new Date(r.checkIn)),
          end: startOfDay(new Date(r.checkOut)),
        })
      );

      if (reservation) {
        const resStart = startOfDay(new Date(reservation.checkIn));
        const resEnd = startOfDay(new Date(reservation.checkOut));
        const visibleStart = max([resStart, startOfDay(dateRange.from)]);
        const visibleEnd = min([resEnd, startOfDay(dateRange.to)]);
        const daysDiff = differenceInDays(visibleEnd, visibleStart);
        const colspan = daysDiff >= 0 ? daysDiff + 1 : 1;

        const statusConfig =
          statusStyles[reservation.status] || statusStyles.confirmed;

        const startsBeforePeriod = resStart < startOfDay(dateRange.from);
        const endsAfterPeriod = resEnd > startOfDay(dateRange.to);

        const paymentPercentage =
          reservation.totalAmount > 0
            ? (reservation.paidAmount / reservation.totalAmount) * 100
            : 0;

        cells.push(
          <td
            key={currentDay.toISOString()}
            colSpan={colspan}
            className={cn(
              "p-1 align-top relative",
              isTodayCell && "bg-primary/10"
            )}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  onClick={() => setSelectedReservation(reservation)}
                  className={cn(
                    "h-full text-white text-xs p-2 flex flex-col justify-start cursor-pointer border-l-4 transition-transform hover:scale-105",
                    statusConfig.color,
                    {
                      "rounded-l-none -ml-2 pl-4": startsBeforePeriod,
                      "rounded-r-none -mr-2 pr-4": endsAfterPeriod,
                      rounded: !startsBeforePeriod && !endsAfterPeriod,
                    }
                  )}
                >
                  <p className="font-bold truncate">{reservation.guestName}</p>
                  <p className="opacity-80 text-[10px]">{statusConfig.label}</p>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-bold text-sm">{reservation.guestName}</p>
                  <p className="text-xs opacity-90">
                    📋 {reservation.reservationCode}
                  </p>
                  <p className="text-xs">
                    📅 {format(new Date(reservation.checkIn), "dd/MM/yyyy")} →{" "}
                    {format(new Date(reservation.checkOut), "dd/MM/yyyy")}
                  </p>
                  <p className="text-xs">
                    📞{" "}
                    {channelLabels[reservation.channel] || reservation.channel}
                  </p>
                  <p className="text-xs">
                    👥 {reservation.totalGuests} huésped(es)
                  </p>

                  {reservation.services.length > 0 && (
                    <p className="text-xs">
                      {reservation.services
                        .map((s) => serviceEmojis[s.toLowerCase()] || "🔹")
                        .join(" ")}{" "}
                      {reservation.services.join(", ")}
                    </p>
                  )}

                  <div className="pt-1 border-t border-white/20">
                    <p className="text-xs font-semibold">
                      💰 ${reservation.paidAmount.toLocaleString("es-CL")} / $
                      {reservation.totalAmount.toLocaleString("es-CL")}
                    </p>
                    <Progress value={paymentPercentage} className="h-1 mt-1" />
                    <p className="text-[10px] opacity-75 mt-0.5">
                      {paymentPercentage.toFixed(0)}% pagado
                    </p>
                  </div>

                  {startsBeforePeriod && (
                    <p className="text-yellow-300 text-xs mt-1">
                      ← Continúa desde antes
                    </p>
                  )}
                  {endsAfterPeriod && (
                    <p className="text-yellow-300 text-xs mt-1">
                      Continúa después →
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </td>
        );

        dayIndex += colspan;
      } else {
        cells.push(
          <td
            key={currentDay.toISOString()}
            className={cn("h-full", isTodayCell && "bg-primary/10")}
          ></td>
        );
        dayIndex += 1;
      }
    }

    return cells;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 h-full flex flex-col">
      {/* 🎯 HEADER */}
      <div className="flex-shrink-0 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Calendario de Ocupación</h1>

        {/* 🏷️ LEYENDA */}
        <Card className="shadow-md">
          <CardContent className="p-3 flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-400 border-2 border-amber-500"></div>
              <span className="text-xs font-medium">Pendiente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500 border-2 border-blue-600"></div>
              <span className="text-xs font-medium">Confirmada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-600 border-2 border-green-700"></div>
              <span className="text-xs font-medium">En Curso</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 📊 PANEL DE ESTADÍSTICAS - DISEÑO HORIZONTAL COMPACTO */}
      {stats && (
        <div className="flex-shrink-0">
          <div className="flex items-center gap-3 bg-card border rounded-lg p-3">
            {/* Ocupación */}
            <div className="flex items-center gap-3 flex-1 pr-3 border-r">
              <div className="p-2 bg-primary/10 rounded">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">Ocupación</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-xl font-bold">{stats.occupiedRooms}</p>
                  <p className="text-sm text-muted-foreground">/ {stats.totalRooms}</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={stats.occupancyRate} className="h-1 flex-1" />
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {stats.occupancyRate}%
                  </p>
                </div>
              </div>
            </div>

            {/* Pendientes */}
            <div className="flex items-center gap-2.5 px-3 border-r">
              <div className="p-2 bg-amber-500/10 rounded">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Pendientes</p>
                <p className="text-xl font-bold text-amber-500">{stats.pending}</p>
              </div>
            </div>

            {/* Confirmadas */}
            <div className="flex items-center gap-2.5 px-3 border-r">
              <div className="p-2 bg-blue-500/10 rounded">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Confirmadas</p>
                <p className="text-xl font-bold text-blue-500">{stats.confirmed}</p>
              </div>
            </div>

            {/* En Curso */}
            <div className="flex items-center gap-2.5 pl-3">
              <div className="p-2 bg-green-600/10 rounded">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">En Curso</p>
                <p className="text-xl font-bold text-green-600">{stats.in_progress}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📅 NAVEGACIÓN Y FILTROS */}
      <div className="flex-shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          {/* Navegación */}
          <div className="flex items-center gap-2 border rounded-lg p-1 bg-card">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousWeek}
              className="h-8"
            >
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              Semana
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="h-8 px-3 font-semibold"
            >
              Hoy
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextWeek}
              className="h-8"
            >
              Semana
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Selector Rápido */}
          <div className="flex items-center gap-2">
            <Button
              variant={
                differenceInDays(dateRange.to, dateRange.from) === 6
                  ? "default"
                  : "outline"
              }
              size="sm"
              onClick={() => setQuickRange(7)}
              className="h-8"
            >
              7 días
            </Button>
            <Button
              variant={
                differenceInDays(dateRange.to, dateRange.from) === 13
                  ? "default"
                  : "outline"
              }
              size="sm"
              onClick={() => setQuickRange(14)}
              className="h-8"
            >
              14 días
            </Button>
            <Button
              variant={
                differenceInDays(dateRange.to, dateRange.from) === 29
                  ? "default"
                  : "outline"
              }
              size="sm"
              onClick={() => setQuickRange(30)}
              className="h-8"
            >
              30 días
            </Button>
          </div>

          {/* Calendarios */}
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-[140px] justify-start h-8"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from
                    ? format(dateRange.from, "dd MMM", { locale: es })
                    : "Desde"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateRange.from}
                  onSelect={handleStartDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-[140px] justify-start h-8"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.to
                    ? format(dateRange.to, "dd MMM", { locale: es })
                    : "Hasta"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateRange.to}
                  onSelect={handleEndDateSelect}
                  disabled={{ before: dateRange.from }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex-grow" />

          {/* Filtros */}
          <Select
            value={filters.type}
            onValueChange={(v) => handleFilterChange("type", v)}
          >
            <SelectTrigger className="w-[160px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Tipos</SelectItem>
              {roomTypes.map((rt) => (
                <SelectItem key={rt.id} value={rt.name}>
                  {rt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.floor}
            onValueChange={(v) => handleFilterChange("floor", v)}
          >
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {floorOptions.map((floor) => (
                <SelectItem key={floor} value={floor}>
                  {floor === "all" ? "Todos" : `Piso ${floor}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {error && (
          <p className="text-destructive mt-2 text-sm">Error: {error}</p>
        )}
      </div>

      {/* 📊 TABLA */}
      <TooltipProvider>
        <div className="flex-grow overflow-auto border rounded-lg bg-card shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Cargando...</p>
              </div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-border table-fixed">
              <thead className="bg-muted/50">
                <tr>
                  <th className="sticky top-0 z-10 bg-muted/50 px-4 py-3 text-left text-xs font-semibold uppercase w-32">
                    Habitación
                  </th>
                  {daysInInterval.map((day) => {
                    const todayCell = isToday(day);
                    return (
                      <th
                        key={day.toISOString()}
                        className={cn(
                          "sticky top-0 z-10 bg-muted/50 px-2 text-center text-xs font-semibold uppercase relative border-l border-border/50",
                          todayCell ? "bg-primary/20 border-l-2 border-l-primary py-5" : "py-3"
                        )}
                      >
                        <div className="relative h-full flex flex-col items-center justify-center">
                          {todayCell && (
                            <Badge variant="default" className="text-[10px] px-2 py-0.5 mb-2">
                              HOY
                            </Badge>
                          )}
                          <div className="text-[10px] opacity-75">{format(day, "EEE", { locale: es })}</div>
                          <div className={cn("font-bold mt-0.5", todayCell && "text-base text-primary")}>
                            {format(day, "dd")}
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRooms.map((room) => (
                  <tr
                    key={room.id}
                    className="h-14 hover:bg-muted/30 transition-colors"
                  >
                    <td className="sticky left-0 bg-card px-4 py-2 w-32 border-r border-border/50">
                      <div className="font-bold text-sm">{room.number}</div>
                      <div className="text-xs text-muted-foreground">
                        {room.type}
                      </div>
                    </td>
                    {renderRoomRow(room)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </TooltipProvider>

      {/* ✅ MODAL CORRECTO - Detalles de Reserva */}
      <Dialog open={!!selectedReservation} onOpenChange={() => setSelectedReservation(null)}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg">Detalles de la Reserva</DialogTitle>
          </DialogHeader>

          <div className="flex-grow overflow-y-auto pr-2 -mr-2">
            {selectedReservation && <ReservationDetailsModal reservation={selectedReservation} />}
          </div>

          <DialogFooter className="flex-shrink-0 mt-3 pt-3 border-t">
            <Button variant="secondary" onClick={() => setSelectedReservation(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TapeChart;
