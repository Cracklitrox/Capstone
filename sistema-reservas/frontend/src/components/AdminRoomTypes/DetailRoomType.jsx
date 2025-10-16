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
  TagIcon,
  UsersIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  HashtagIcon,
} from "@heroicons/react/24/outline";

const DetailRoomType = ({ open, onClose, roomType }) => {
  if (!roomType) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-3xl font-bold text-primary flex items-center gap-2">
                <TagIcon className="h-8 w-8" />
                {roomType.name}
              </DialogTitle>
              <DialogDescription className="text-base">
                Información completa del tipo de habitación
              </DialogDescription>
            </div>
            <Badge
              variant={roomType.is_active ? "success" : "destructive"}
              className="text-base px-3 py-1"
            >
              {roomType.is_active ? "Activo" : "Inactivo"}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Información principal en cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Capacidad base */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <UsersIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Capacidad Base
                    </p>
                    <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                      {roomType.base_capacity}{" "}
                      {roomType.base_capacity === 1 ? "persona" : "personas"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ID del tipo */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <HashtagIcon className="h-6 w-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      Identificador
                    </p>
                    <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                      ID #{roomType.id}
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
                  {roomType.is_active ? (
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  ) : (
                    <XCircleIcon className="h-6 w-6 text-red-600" />
                  )}
                  <div>
                    <p className="font-semibold text-foreground">
                      Estado de Activación
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {roomType.is_active
                        ? "El tipo está activo y puede ser asignado a habitaciones"
                        : "El tipo está inactivo y no puede ser asignado"}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={roomType.is_active ? "success" : "destructive"}
                  className="text-base"
                >
                  {roomType.is_active ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Descripción (si existe) */}
          {roomType.description ? (
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 border-slate-200 dark:border-slate-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <DocumentTextIcon className="h-6 w-6 text-slate-600 dark:text-slate-400 flex-shrink-0 mt-1" />
                  <div className="space-y-2 flex-1">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      Descripción
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {roomType.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <DocumentTextIcon className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground italic">
                    Sin descripción proporcionada
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Información adicional en grid pequeño */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                ID del Tipo
              </p>
              <p className="text-sm font-mono font-semibold text-foreground">
                #{roomType.id}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Nombre
              </p>
              <p className="text-sm font-mono font-semibold text-foreground">
                {roomType.name}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Capacidad Base
              </p>
              <p className="text-sm font-mono font-semibold text-foreground">
                {roomType.base_capacity}{" "}
                {roomType.base_capacity === 1 ? "persona" : "personas"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Estado
              </p>
              <p className="text-sm font-mono font-semibold text-foreground">
                {roomType.is_active ? "Activo" : "Inactivo"}
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

export default DetailRoomType;
