import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import {
  HomeIcon,
  BuildingOfficeIcon,
  UsersIcon,
  CurrencyDollarIcon,
  TagIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

const RoomDetail = ({ open, onClose, room, roomTypeName }) => {
  if (!room) return null;

  // Mapeo de estado a español y variante de badge
  const statusMap = {
    available: { label: "Disponible", variant: "success" },
    occupied: { label: "Ocupada", variant: "destructive" },
    pending: { label: "Pendiente", variant: "warning" },
    cleaning: { label: "Limpieza", variant: "info" },
    maintenance: { label: "Mantenimiento", variant: "secondary" },
    unavailable: { label: "No disponible", variant: "secondary" },
  };

  const statusInfo = statusMap[room.status] || {
    label: room.status,
    variant: "secondary",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-3xl font-bold text-primary flex items-center gap-2">
                <HomeIcon className="h-8 w-8" />
                Habitación {room.room_number}
              </DialogTitle>
              <DialogDescription className="text-base">
                Información completa de la habitación
              </DialogDescription>
            </div>
            <Badge variant={statusInfo.variant} className="text-base px-3 py-1">
              {statusInfo.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Información principal en cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tipo de habitación */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <TagIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Tipo de Habitación
                    </p>
                    <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                      {roomTypeName || room.room_type_name || "Sin especificar"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Piso */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <BuildingOfficeIcon className="h-6 w-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      Piso
                    </p>
                    <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                      Piso {room.floor}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Capacidad */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <UsersIcon className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                      Capacidad
                    </p>
                    <p className="text-lg font-bold text-green-900 dark:text-green-100">
                      {room.capacity}{" "}
                      {room.capacity === 1 ? "persona" : "personas"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Precio base */}
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CurrencyDollarIcon className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-1" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                      Precio Base
                    </p>
                    <p className="text-lg font-bold text-amber-900 dark:text-amber-100">
                      ${room.base_price?.toLocaleString("es-CL")}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      por noche
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Estado de activación */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {room.is_active ? (
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  ) : (
                    <XCircleIcon className="h-6 w-6 text-red-600" />
                  )}
                  <div>
                    <p className="font-semibold text-foreground">
                      Estado de Activación
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {room.is_active
                        ? "La habitación está activa y disponible para reservas"
                        : "La habitación está inactiva y no acepta reservas"}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={room.is_active ? "success" : "destructive"}
                  className="text-base"
                >
                  {room.is_active ? "Activa" : "Inactiva"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Descripción (si existe) */}
          {room.description && (
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 border-slate-200 dark:border-slate-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <DocumentTextIcon className="h-6 w-6 text-slate-600 dark:text-slate-400 flex-shrink-0 mt-1" />
                  <div className="space-y-2 flex-1">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      Descripción
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {room.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Información adicional en grid pequeño */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                ID de Habitación
              </p>
              <p className="text-sm font-mono font-semibold text-foreground">
                #{room.id}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Número
              </p>
              <p className="text-sm font-mono font-semibold text-foreground">
                {room.room_number}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                ID Tipo
              </p>
              <p className="text-sm font-mono font-semibold text-foreground">
                #{room.room_type_id}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Estado Actual
              </p>
              <p className="text-sm font-mono font-semibold text-foreground">
                {room.status}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button onClick={onClose} className="w-full sm:w-auto">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RoomDetail;
