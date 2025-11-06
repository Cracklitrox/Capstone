import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";
import { Progress } from "@/components/ui/Progress";
import {
  CreditCardIcon,
  BanknotesIcon,
  DevicePhoneMobileIcon,
  BuildingLibraryIcon,
} from "@heroicons/react/24/outline";

const statusLabels = {
  pending: { label: "Pendiente", variant: "warning" },
  confirmed: { label: "Confirmada", variant: "default" },
  in_progress: { label: "En Curso", variant: "success" },
  completed: { label: "Completada", variant: "secondary" },
  canceled: { label: "Cancelada", variant: "destructive" },
};

const paymentMethodLabels = {
  cash: { label: "Efectivo", icon: BanknotesIcon },
  credit_card: { label: "Tarjeta de Crédito", icon: CreditCardIcon },
  debit_card: { label: "Tarjeta de Débito", icon: CreditCardIcon },
  bank_transfer: { label: "Transferencia", icon: BuildingLibraryIcon },
  multiple: { label: "Múltiples", icon: DevicePhoneMobileIcon },
};

function RoomDetailsTabsModal({ roomDetails, onShowDetail }) {
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: es });
    } catch {
      return "Fecha inválida";
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM HH:mm", { locale: es });
    } catch {
      return "N/A";
    }
  };

  // Determinar estado y tab por defecto
  const roomStatus = roomDetails.status?.toLowerCase();
  const isOccupied = roomStatus === "occupied";
  const isPending = roomStatus === "pending";
  const isCleaning = roomStatus === "cleaning";
  const isMaintenance = roomStatus === "maintenance";

  // Determinar tab por defecto según estado
  let defaultTab = "reservations";
  if (isOccupied || isPending) defaultTab = "info";
  else if (isCleaning) defaultTab = "cleaning";
  else if (isMaintenance) defaultTab = "maintenance";

  // 🔧 NOMBRES CORRECTOS DEL BACKEND
  const recentReservations = roomDetails?.reservationHistory || [];
  const cleaningRecords = roomDetails?.cleaningHistory || [];
  const maintenanceTasks = roomDetails?.maintenanceHistory || [];
  const currentReservation = roomDetails?.currentReservation || null;

  // Si está ocupada/pendiente, mostrar tabs de reserva actual
  if ((isOccupied || isPending) && currentReservation) {
    const pendingAmount =
      (currentReservation.totalAmount || 0) -
      (currentReservation.paidAmount || 0);
    const paymentPercentage =
      currentReservation.totalAmount > 0
        ? Math.min((currentReservation.paidAmount / currentReservation.totalAmount) * 100, 100)
        : 0;

    return (
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="services">Servicios</TabsTrigger>
          <TabsTrigger value="payments">Pagos</TabsTrigger>
        </TabsList>

        {/* TAB: INFORMACIÓN */}
        <TabsContent value="info" className="space-y-4">
          <Card
            className={
              isPending
                ? "border-l-4 border-l-orange-500"
                : "border-l-4 border-l-red-500"
            }
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">
                  {isPending
                    ? "Reserva Pendiente (Check-in Hoy)"
                    : "Reserva Actual"}
                </CardTitle>
                <Badge variant={isPending ? "warning" : "destructive"}>
                  {isPending ? "Pendiente" : "En Curso"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Código Reserva</p>
                <p className="font-semibold">{currentReservation.code}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">
                  Huésped Principal
                </p>
                <p className="font-semibold">{currentReservation.guestName}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Check-in</p>
                  <p className="text-sm font-medium">
                    {formatDate(currentReservation.checkIn)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Check-out</p>
                  <p className="text-sm font-medium">
                    {formatDate(currentReservation.checkOut)}
                  </p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Total Huéspedes</p>
                <p className="text-sm font-medium">
                  👥 {currentReservation.guestCount || 1}{" "}
                  {(currentReservation.guestCount || 1) === 1
                    ? "persona"
                    : "personas"}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: SERVICIOS */}
        <TabsContent value="services">
          {currentReservation.services &&
          currentReservation.services.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servicio</TableHead>
                  <TableHead className="text-center">Cantidad</TableHead>
                  <TableHead className="text-right">Precio Unit.</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentReservation.services.map((service, idx) => (
                  <TableRow key={`service-${idx}`}>
                    <TableCell className="font-medium">
                      {service.name}
                    </TableCell>
                    <TableCell className="text-center">
                      {service.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      ${(service.unitPrice || 0).toLocaleString("es-CL")}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      $
                      {(
                        (service.unitPrice || 0) * (service.quantity || 1)
                      ).toLocaleString("es-CL")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No hay servicios contratados
            </p>
          )}
        </TabsContent>

        {/* TAB: PAGOS */}
        <TabsContent value="payments">
          <div className="space-y-4">
            {/* Resumen de Pagos */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Total</p>
                  <p className="text-xl font-bold">
                    $
                    {(currentReservation.totalAmount || 0).toLocaleString(
                      "es-CL"
                    )}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Pagado</p>
                  <p className="text-xl font-bold text-green-600">
                    $
                    {(currentReservation.paidAmount || 0).toLocaleString(
                      "es-CL"
                    )}
                  </p>
                </CardContent>
              </Card>
              <Card
                className={pendingAmount > 0 ? "border-amber-500 border-2" : ""}
              >
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    Pendiente
                  </p>
                  <p className="text-xl font-bold text-amber-500">
                    ${pendingAmount.toLocaleString("es-CL")}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* PROGRESS BAR */}
            <Card>
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium">Progreso de Pago</p>
                  <p className="text-sm font-semibold">
                    {paymentPercentage.toFixed(0)}%
                  </p>
                </div>
                <Progress value={paymentPercentage} className="h-3" />
                <p className="text-xs text-muted-foreground">
                  {pendingAmount > 0
                    ? `Faltan $${pendingAmount.toLocaleString("es-CL")} por pagar`
                    : "Pago completado ✓"}
                </p>
              </CardContent>
            </Card>

            <Separator />

            {/* Tabla de Pagos */}
            {currentReservation.payments &&
            currentReservation.payments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Monto</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentReservation.payments.map((payment, idx) => {
                    const PaymentIcon =
                      paymentMethodLabels[payment.method]?.icon ||
                      BanknotesIcon;
                    const methodLabel =
                      paymentMethodLabels[payment.method]?.label ||
                      payment.method;

                    return (
                      <TableRow key={`payment-${idx}`}>
                        <TableCell className="font-semibold">
                          ${(payment.amount || 0).toLocaleString("es-CL")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <PaymentIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{methodLabel}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payment.status === "completed"
                                ? "success"
                                : "warning"
                            }
                          >
                            {payment.status === "completed"
                              ? "Completado"
                              : payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No hay pagos registrados
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    );
  }

  // Si está disponible/limpieza/mantenimiento, mostrar tabs de historial
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="reservations">
          Reservas ({recentReservations.length})
        </TabsTrigger>
        <TabsTrigger value="cleaning">
          Limpieza ({cleaningRecords.length})
        </TabsTrigger>
        <TabsTrigger value="maintenance">
          Mantenimiento ({maintenanceTasks.length})
        </TabsTrigger>
      </TabsList>

      {/* TAB: RESERVAS */}
      <TabsContent value="reservations" className="space-y-3">
        {recentReservations.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No hay reservas recientes para esta habitación
          </p>
        ) : (
          recentReservations.map((reservation) => (
            <Card
              key={reservation.reservationId}
              className="cursor-pointer hover:bg-muted/50 transition"
              onClick={() => onShowDetail?.("reservation", reservation)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{reservation.code}</p>
                    <p className="text-sm text-muted-foreground">
                      {reservation.guestName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(reservation.checkIn)} →{" "}
                      {formatDate(reservation.checkOut)}
                    </p>
                  </div>
                  <Badge variant="secondary">Completada</Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      {/* TAB: LIMPIEZA */}
      <TabsContent value="cleaning">
        {cleaningRecords.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No hay registros de limpieza
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Observaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cleaningRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{formatDate(record.date)}</TableCell>
                  <TableCell>{record.receptionist}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {record.observations || "Sin observaciones"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TabsContent>

      {/* TAB: MANTENIMIENTO */}
      <TabsContent value="maintenance">
        {maintenanceTasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No hay tareas de mantenimiento
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Prioridad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintenanceTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>{formatDateTime(task.created_at)}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {task.description}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        task.priority === "critical"
                          ? "destructive"
                          : task.priority === "high"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {task.priority}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TabsContent>
    </Tabs>
  );
}

export default RoomDetailsTabsModal;
