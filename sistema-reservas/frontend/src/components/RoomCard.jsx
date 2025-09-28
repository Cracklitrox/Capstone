import React from "react";
import { Badge } from "@/components/ui/Badge.jsx";
import { Button } from "@/components/ui/Button.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/Dropdown-menu.jsx";
import {
  UserIcon,
  CalendarDaysIcon,
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

const statusVariants = {
  available: "success",
  occupied: "destructive",
  cleaning: "info",
  maintenance: "secondary",
  pending: "warning",
  reservado: "warning",
};

const statusLabels = {
  available: "Disponible",
  occupied: "Ocupada",
  cleaning: "Limpieza",
  maintenance: "Mantenimiento",
  pending: "Pendiente",
  reservado: "Reservado",
};

function RoomCard({ room, onDetails, onStatusChange, onCheckIn, onCheckOut }) {
  const status = (room.status || "unknown").toLowerCase();
  const variant = statusVariants[status] || "secondary";
  const label = statusLabels[status] || "Desconocido";

  const menuOptions = [
    { label: "Marcar como Limpieza", value: "cleaning" },
    { label: "Poner en Mantenimiento", value: "maintenance" },
    { label: "Marcar como Disponible", value: "available" },
  ];

  const guestName = room.reservation?.guest
    ? `${room.reservation.guest.first_name || ""} ${room.reservation.guest.paternal_last_name || ""}`.trim()
    : null;
  const dateRange =
    room.reservation?.check_in_date && room.reservation?.check_out_date
      ? (() => {
          const checkIn = new Date(room.reservation.check_in_date);
          const dayIn = checkIn.getDate();
          const month = checkIn
            .toLocaleString("es-ES", { month: "short" })
            .replace(".", "");
          return `${dayIn} ${month.charAt(0).toUpperCase() + month.slice(1)}`;
        })()
      : null;

  const today = new Date().toISOString().split("T")[0];
  const checkInDate = room.reservation?.check_in_date
    ? new Date(room.reservation.check_in_date).toISOString().split("T")[0]
    : null;
  const checkOutDate = room.reservation?.check_out_date
    ? new Date(room.reservation.check_out_date).toISOString().split("T")[0]
    : null;

  const showCheckIn = status === "pending" && checkInDate === today;
  const showCheckOut = status === "occupied" && checkOutDate === today;

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between rounded-lg border-l-4 p-3 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 bg-card text-card-foreground",
        status === "available" && "border-green-500",
        status === "occupied" && "border-red-500",
        status === "cleaning" && "border-blue-500",
        status === "maintenance" && "border-slate-500",
        (status === "pending" || status === "reservado") && "border-orange-500"
      )}
    >
      <div
        onClick={() => onDetails?.(room)}
        className="flex flex-col flex-grow cursor-pointer"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold text-lg text-foreground">{room.number}</p>
            <p className="text-xs text-muted-foreground">
              {room.type || "No especificado"}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">P.{room.floor}</p>
        </div>
        <div className="flex-grow" />
        <div className="flex items-end justify-between">
          {guestName && dateRange ? (
            <div className="space-y-1 text-xs text-muted-foreground overflow-hidden">
              <p className="flex items-center gap-1.5 truncate">
                <UserIcon className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{guestName}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <CalendarDaysIcon className="h-3 w-3 flex-shrink-0" />
                {dateRange}
              </p>
            </div>
          ) : (
            <div />
          )}

          {/* --- CAMBIO PRINCIPAL AQUÍ --- */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Badge
                variant={variant}
                className="cursor-pointer hover:brightness-90 transition-all"
              >
                {label}
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {menuOptions
                .filter((opt) => opt.value !== room.status)
                .map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onSelect={() => onStatusChange(room.id, opt.value)}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {(showCheckIn || showCheckOut) && (
        <div className="mt-2 border-t border-border pt-2 flex gap-2">
          {showCheckIn && (
            <Button
              size="sm"
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={(e) => {
                e.stopPropagation();
                onCheckIn(room.id, room.reservation.id);
              }}
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
              Check-in
            </Button>
          )}
          {showCheckOut && (
            <Button
              size="sm"
              variant="destructive"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                onCheckOut(room.id, room.reservation.id);
              }}
            >
              <ArrowLeftOnRectangleIcon className="h-4 w-4 mr-2" />
              Check-out
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default RoomCard;