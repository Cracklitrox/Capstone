import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApiCache } from "@/hooks/useApiCache";
import { getPlanningData } from "@/services/planning";
import { fetchRooms, fetchRoomTypes } from "@/services/rooms";
import { fetchRoomDetails } from "@/services/roomDetails";
import {
  addDays,
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
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Calendar } from "@/components/ui/Calendar";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import RoomHistory from "@/components/RoomHistory";
import { cn } from "@/lib/utils";

// ... (statusStyles no cambia)
const statusStyles = {
  pending: { label: "Pendiente", color: "bg-orange-400 border-orange-500" },
  confirmed: { label: "Confirmada", color: "bg-red-500 border-red-600" },
  in_progress: { label: "En Curso", color: "bg-red-600 border-red-700" },
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ type: "all", floor: "all" });
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomDetails, setRoomDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

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

  // ... (resto de la lógica y carga de datos sin cambios)
  useEffect(() => {
    if (token) {
      setLoading(!0);
      Promise.all([
        cachedFetch('rooms-list', () => fetchRooms(token)),
        cachedFetch('room-types', () => fetchRoomTypes(token))
      ])
        .then(([e, t]) => {
          setAllRooms(e.sort((a, b) => a.number.localeCompare(b.number)));
          setRoomTypes(t);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(!1));
    }
  }, [token, cachedFetch]);
  useEffect(() => {
    if (token && dateRange.from && dateRange.to && allRooms.length > 0) {
      setLoading(!0);
      getPlanningData(dateRange.from, dateRange.to, token)
        .then(setPlanningData)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(!1));
    }
  }, [token, dateRange, allRooms]);
  const filteredRooms = useMemo(
    () =>
      allRooms.filter((e) => {
        const t = filters.type === "all" || e.type === filters.type;
        const a = filters.floor === "all" || String(e.floor) === filters.floor;
        return t && a;
      }),
    [allRooms, filters]
  );
  const handleFilterChange = (e, t) => {
    setFilters((a) => ({ ...a, [e]: t }));
  };
  const floorOptions = useMemo(
    () => ["all", ...new Set(allRooms.map((e) => String(e.floor)))],
    [allRooms]
  );
  const openDetails = async (e) => {
    setSelectedRoom(e);
    setDetailsLoading(!0);
    setDetailsError(null);
    try {
      const t = await fetchRoomDetails(e.id, token);
      setRoomDetails(t);
    } catch (e) {
      setDetailsError(e?.message || "Error al cargar detalles");
    } finally {
      setDetailsLoading(!1);
    }
  };
  const daysInInterval = useMemo(
    () =>
      dateRange.from && dateRange.to
        ? eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
        : [],
    [dateRange]
  );
  const reservationsByRoomId = useMemo(
    () =>
      planningData.reduce((e, t) => {
        e[t.roomId] = t.reservations;
        return e;
      }, {}),
    [planningData]
  );
  const renderRoomRow = (e) => {
    const t = reservationsByRoomId[e.id] || [];
    const a = [];
    let l = 0;
    while (l < daysInInterval.length) {
      const n = daysInInterval[l];
      const s = isToday(n);
      const i = t.find((r) =>
        isWithinInterval(n, {
          start: startOfDay(new Date(r.checkIn)),
          end: startOfDay(new Date(r.checkOut)),
        })
      );
      if (i) {
        const r = startOfDay(new Date(i.checkIn));
        const o = startOfDay(new Date(i.checkOut));
        const d = max([r, startOfDay(dateRange.from)]);
        const c = min([o, startOfDay(dateRange.to)]);
        const m = differenceInDays(c, d);
        const p = m >= 0 ? m + 1 : 1;
        const u = statusStyles[i.status] || {
          label: "Ocupado",
          color: "bg-gray-400 border-gray-500",
        };
        const f = r < startOfDay(dateRange.from);
        const h = o > startOfDay(dateRange.to);
        a.push(
          <td
            key={n.toISOString()}
            colSpan={p}
            className={cn("p-1 align-top relative", s && "bg-primary/10")}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  onClick={() => openDetails(e)}
                  className={cn(
                    "h-full text-white text-xs p-2 flex flex-col justify-start cursor-pointer border-l-4",
                    u.color,
                    {
                      "rounded-l-none -ml-2 pl-4": f,
                      "rounded-r-none -mr-2 pr-4": h,
                      rounded: !f && !h,
                    }
                  )}
                >
                  <p className="font-bold truncate">{i.guestName}</p>
                  <p className="opacity-80 capitalize">{u.label}</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div>
                  <p className="font-bold">{i.guestName}</p>
                  <p>Check-in: {format(new Date(i.checkIn), "dd/MM/yyyy")}</p>
                  <p>Check-out: {format(new Date(i.checkOut), "dd/MM/yyyy")}</p>
                  <p className="capitalize">Estado: {i.status}</p>
                  {f && (
                    <p className="text-yellow-300 mt-1">
                      ← Continúa desde antes
                    </p>
                  )}
                  {h && (
                    <p className="text-yellow-300 mt-1">Continúa después →</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </td>
        );
        l += p;
      } else {
        a.push(
          <td
            key={n.toISOString()}
            className={cn("h-full", s && "bg-primary/10")}
          ></td>
        );
        l += 1;
      }
    }
    return a;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 h-full flex flex-col">
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold">Calendario de Ocupación</h1>
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className="w-[150px] justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    format(dateRange.from, "dd, LLL y", { locale: es })
                  ) : (
                    <span>Desde...</span>
                  )}
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

            {/* Calendario "Hasta" */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className="w-[150px] justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.to ? (
                    format(dateRange.to, "dd, LLL y", { locale: es })
                  ) : (
                    <span>Hasta...</span>
                  )}
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
          <div className="flex items-center gap-2">
            <Select
              value={filters.type}
              onValueChange={(value) => handleFilterChange("type", value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de Habitación..." />
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
              onValueChange={(value) => handleFilterChange("floor", value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Piso..." />
              </SelectTrigger>
              <SelectContent>
                {floorOptions.map((floor) => (
                  <SelectItem key={floor} value={floor}>
                    {floor === "all" ? "Todos los Pisos" : `Piso ${floor}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {error && <p className="text-destructive mt-2">Error: {error}</p>}
      </div>

      <TooltipProvider>
        <div className="flex-grow overflow-auto border rounded-lg bg-card">
          {loading ? (
            <p className="p-4 text-center">Cargando datos del calendario...</p>
          ) : (
            <table className="min-w-full divide-y divide-border table-fixed">
              <thead className="bg-muted/50">
                <tr>
                  <th className="sticky top-0 z-10 bg-muted/50 px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground w-36">
                    Habitación
                  </th>
                  {daysInInterval.map((e) => (
                    <th
                      key={e.toISOString()}
                      className={cn(
                        "sticky top-0 z-10 bg-muted/50 px-2 py-2 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground",
                        isToday(e) && "bg-primary/20 text-primary-foreground"
                      )}
                    >
                      <div>{format(e, "E", { locale: es })}</div>
                      <div>{format(e, "dd")}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRooms.map((e) => (
                  <tr key={e.id} className="h-14">
                    <td className="sticky left-0 bg-card px-3 py-2 whitespace-nowrap w-36">
                      <div className="font-bold text-sm">{e.number}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.type}
                      </div>
                    </td>
                    {renderRoomRow(e)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </TooltipProvider>
      <Dialog open={!!selectedRoom} onOpenChange={() => setSelectedRoom(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Detalles de la Habitación {selectedRoom?.number}
            </DialogTitle>
            <DialogDescription>
              {roomDetails?.type} - Capacidad para {roomDetails?.capacity}{" "}
              personas
            </DialogDescription>
          </DialogHeader>
          {detailsLoading && (
            <p className="text-center text-muted-foreground py-8">
              Cargando detalles...
            </p>
          )}
          {detailsError && (
            <p className="text-destructive text-center py-8">{detailsError}</p>
          )}
          {roomDetails && <RoomHistory roomDetails={roomDetails} />}
          <DialogFooter className="mt-4">
            <Button variant="secondary" onClick={() => setSelectedRoom(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TapeChart;
