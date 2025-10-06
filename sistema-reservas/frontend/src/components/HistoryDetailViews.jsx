import React from "react";
import { Button } from "@/components/ui/Button.jsx";
import { Badge } from "@/components/ui/Badge.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs.jsx";
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
} from "@heroicons/react/24/outline";

const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-2 border-b last:border-0">
    {Icon && <Icon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />}
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
              <Badge variant="secondary" className="ml-1.5 h-5 w-5 rounded-full p-0 text-xs">
                {item.services.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="payments">Pagos</TabsTrigger>
        </TabsList>

        {/* TAB: General */}
        <TabsContent value="general" className="space-y-3 mt-3 max-h-80 overflow-y-auto pr-2">
          {/* Huésped */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
              <UserIcon className="h-4 w-4" />
              Huésped
            </h4>
            <DetailRow label="Nombre" value={item.guestName} />
            <DetailRow label="Identificación" value={item.guestIdentification} />
            <DetailRow label="Email" value={item.guestEmail} />
            <DetailRow label="Teléfono" value={item.guestPhone} />
          </div>

          {/* Reserva */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
              <CalendarIcon className="h-4 w-4" />
              Reserva
            </h4>
            <DetailRow label="Código" value={item.code} />
            <DetailRow
              label="Check-in"
              value={new Date(item.checkIn).toLocaleDateString("es-CL", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            />
            <DetailRow
              label="Check-out"
              value={new Date(item.checkOut).toLocaleDateString("es-CL", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            />
            <DetailRow label="Huéspedes" value={item.guestCount} />
          </div>

          {/* Habitaciones */}
          {item.rooms && item.rooms.length > 0 && (
            <div className="bg-muted/30 rounded-lg p-3">
              <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <HomeIcon className="h-4 w-4" />
                Habitaciones ({item.rooms.length})
              </h4>
              <div className="space-y-1.5">
                {item.rooms.map((room, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-background rounded p-2 text-sm"
                  >
                    <span className="font-medium">Hab. {room.number}</span>
                    <Badge variant="outline" className="text-xs">
                      {room.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB: Servicios */}
        <TabsContent value="services" className="mt-3 max-h-80 overflow-y-auto pr-2">
          {item.services && item.services.length > 0 ? (
            <div className="space-y-2">
              {item.services.map((service, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-muted/30 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingBagIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{service.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Cantidad: {service.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold">
                    {formatCurrency(service.unitPrice)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No se agregaron servicios adicionales
            </div>
          )}
        </TabsContent>

        {/* TAB: Pagos */}
        <TabsContent value="payments" className="mt-3 max-h-80 overflow-y-auto pr-2">
          <div className="space-y-3">
            {/* Resumen */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Total Reserva</span>
                <span className="font-bold text-lg">
                  {formatCurrency(item.totalAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-t">
                <span className="text-sm text-muted-foreground">Total Pagado</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(item.paidAmount)}
                </span>
              </div>
              {item.totalAmount - item.paidAmount > 0 && (
                <div className="flex items-center justify-between py-1 border-t">
                  <span className="text-sm text-muted-foreground">Pendiente</span>
                  <span className="font-semibold text-orange-600">
                    {formatCurrency(item.totalAmount - item.paidAmount)}
                  </span>
                </div>
              )}
            </div>

            {/* Detalle de pagos */}
            {item.payments && item.payments.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <CurrencyDollarIcon className="h-4 w-4" />
                  Detalle de Pagos
                </h4>
                <div className="space-y-2">
                  {item.payments.map((payment, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-muted/30 rounded-lg p-3"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {paymentMethodTranslations[payment.method] || payment.method}
                        </p>
                        <Badge
                          variant={paymentStatusVariant[payment.status] || "secondary"}
                          className="mt-1 text-xs"
                        >
                          {payment.status}
                        </Badge>
                      </div>
                      <span className="font-semibold">
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>
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