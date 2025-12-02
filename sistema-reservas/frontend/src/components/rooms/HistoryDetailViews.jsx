import React from "react";
import { Button } from "../ui/Button.jsx";
import { Badge } from "../ui/Badge.jsx";
import { Card, CardContent } from "../ui/Card.jsx";
import { Progress } from "../ui/Progress.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/Tabs.jsx";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  IdentificationIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  HomeIcon,
  ShoppingBagIcon,
  UsersIcon,
  HashtagIcon,
  MoonIcon,
} from "@heroicons/react/24/outline";

const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-2 border-b last:border-0">
    {Icon && (
      <Icon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
    )}
    <div className="flex flex-col min-w-0 flex-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium break-words">{value || "-"}</span>
    </div>
  </div>
);

export const MaintenanceDetailView = ({ item, onBack }) => {
  const statusTranslations = {
    pending: "Pendiente",
    in_progress: "En Progreso",
    delayed: "Retrasada",
    completed: "Completada",
    blocked: "Bloqueada",
  };

  const priorityTranslations = {
    low: "Baja",
    medium: "Media",
    high: "Alta",
    critical: "Crítica",
  };

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Volver
      </Button>
      <div className="space-y-2">
        <DetailRow label="Descripción" value={item.description} />
        <DetailRow
          label="Estado"
          value={statusTranslations[item.status] || item.status}
        />
        <DetailRow
          label="Prioridad"
          value={priorityTranslations[item.priority] || item.priority}
        />
        <DetailRow
          label="Fecha de Inicio"
          value={new Date(item.start_date).toLocaleDateString("es-CL")}
        />
        <DetailRow
          label="Fecha de Fin"
          value={
            item.end_date
              ? new Date(item.end_date).toLocaleDateString("es-CL")
              : "En progreso"
          }
        />
      </div>
    </div>
  );
};

export const CleaningDetailView = ({ item, onBack }) => {
  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Volver
      </Button>
      <div className="space-y-2">
        <DetailRow label="Realizado por" value={item.receptionist} />
        <DetailRow
          label="Fecha"
          value={new Date(item.date).toLocaleDateString("es-CL")}
        />
        <DetailRow label="Observaciones" value={item.observations} />
      </div>
    </div>
  );
};

export const ReservationDetailView = ({ item, onBack }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(amount);
  };

  const paymentMethodTranslations = {
    bank_transfer: "Transf. Bancaria",
    cash: "Efectivo",
    credit_card: "T. Crédito",
    debit_card: "T. Débito",
    multiple: "Múltiples",
  };

  const paymentStatusVariant = {
    pending: "warning",
    confirmed: "success",
    rejected: "destructive",
    refunded: "secondary",
  };

  // Calcular noches
  const checkIn = new Date(item.checkIn);
  const checkOut = new Date(item.checkOut);
  const diffTime = Math.abs(checkOut - checkIn);
  const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Progreso de pago
  const paymentProgress =
    item.totalAmount > 0 ? Math.min((item.paidAmount / item.totalAmount) * 100, 100) : 0;

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-3">
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Volver
      </Button>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="services">
            Servicios
            {item.services && item.services.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1.5 h-5 w-5 rounded-full p-0 text-xs"
              >
                {item.services.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="payments">Pagos</TabsTrigger>
        </TabsList>

        {/* TAB: General */}
        <TabsContent
          value="general"
          className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-2"
        >
          {/* Código y duración */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <HashtagIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Código de Reserva
                    </p>
                    <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                      {item.code}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <MoonIcon className="h-6 w-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      Duración de Estadía
                    </p>
                    <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                      {nights} {nights === 1 ? "noche" : "noches"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Huésped */}
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-4">
                <UserIcon className="h-5 w-5 text-primary" />
                Información del Huésped
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Nombre</p>
                  <p className="font-medium">{item.guestName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Identificación
                  </p>
                  <p className="font-medium font-mono">
                    {item.guestIdentification}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium text-sm break-all">
                    {item.guestEmail || "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Teléfono</p>
                  <p className="font-medium">{item.guestPhone || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fechas */}
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-4">
                <CalendarIcon className="h-5 w-5 text-primary" />
                Fechas de Estadía
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Check-in</p>
                  <p className="font-medium">
                    {new Date(item.checkIn).toLocaleDateString("es-CL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Check-out</p>
                  <p className="font-medium">
                    {new Date(item.checkOut).toLocaleDateString("es-CL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <UsersIcon className="h-4 w-4" />
                <span>
                  {item.guestCount}{" "}
                  {item.guestCount === 1 ? "huésped" : "huéspedes"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Habitaciones */}
          {item.rooms && item.rooms.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h4 className="font-semibold text-sm flex items-center gap-2 mb-4">
                  <HomeIcon className="h-5 w-5 text-primary" />
                  Habitaciones ({item.rooms.length})
                </h4>
                <div className="space-y-2">
                  {item.rooms.map((room, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-muted/30 rounded-lg p-3"
                    >
                      <span className="font-medium">
                        Habitación {room.number}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {room.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB: Servicios */}
        <TabsContent
          value="services"
          className="mt-4 max-h-[60vh] overflow-y-auto pr-2"
        >
          {item.services && item.services.length > 0 ? (
            <div className="space-y-3">
              {item.services.map((service, idx) => (
                <Card key={idx}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ShoppingBagIcon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Cantidad: {service.quantity}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(service.unitPrice)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          por unidad
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center py-8 text-muted-foreground text-sm">
                  No se agregaron servicios adicionales
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB: Pagos */}
        <TabsContent
          value="payments"
          className="mt-4 max-h-[60vh] overflow-y-auto pr-2"
        >
          <div className="space-y-4">
            {/* Resumen con progress bar */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Total Reserva
                    </p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {formatCurrency(item.totalAmount)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Pagado
                    </p>
                    <p className="text-xl font-bold text-green-900 dark:text-green-100">
                      {formatCurrency(item.paidAmount)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-700 dark:text-green-300">
                      Progreso de pago
                    </span>
                    <span className="font-semibold text-green-900 dark:text-green-100">
                      {paymentProgress.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={paymentProgress} className="h-3" />
                </div>

                {item.totalAmount - item.paidAmount > 0 && (
                  <div className="pt-3 border-t border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-700 dark:text-green-300">
                        Pendiente
                      </span>
                      <span className="font-semibold text-orange-600 dark:text-orange-400">
                        {formatCurrency(item.totalAmount - item.paidAmount)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detalle de pagos */}
            {item.payments && item.payments.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <CurrencyDollarIcon className="h-5 w-5 text-primary" />
                  Detalle de Pagos
                </h4>
                <div className="space-y-3">
                  {item.payments.map((payment, idx) => (
                    <Card key={idx}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {paymentMethodTranslations[payment.method] ||
                                payment.method}
                            </p>
                            <Badge
                              variant={
                                paymentStatusVariant[payment.status] ||
                                "secondary"
                              }
                              className="mt-2 text-xs"
                            >
                              {payment.status}
                            </Badge>
                          </div>
                          <p className="text-xl font-semibold">
                            {formatCurrency(payment.amount)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
