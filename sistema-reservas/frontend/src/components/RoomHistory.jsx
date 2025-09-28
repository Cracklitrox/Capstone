// ruta: frontend/src/components/RoomHistory.jsx

import React, { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import {
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  IdentificationIcon,
  ChatBubbleBottomCenterTextIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 py-2">
    <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{value || "-"}</span>
    </div>
  </div>
);

const GuestTab = ({ guest }) => (
  <div className="space-y-2 pt-2">
    <InfoRow
      icon={UserCircleIcon}
      label="Nombre Completo"
      value={guest?.fullName}
    />
    <InfoRow icon={IdentificationIcon} label="RUT" value={guest?.rut} />
    <InfoRow icon={EnvelopeIcon} label="Email" value={guest?.email} />
    <InfoRow icon={PhoneIcon} label="Teléfono" value={guest?.phone} />
    <InfoRow
      icon={ChatBubbleBottomCenterTextIcon}
      label="Peticiones Especiales"
      value={guest?.special_requests}
    />
    <InfoRow
      icon={ClipboardDocumentListIcon}
      label="Observaciones"
      value={guest?.observations}
    />
  </div>
);

const CleaningHistoryTab = ({ history = [], onShowDetail }) => (
  <div className="max-h-60 overflow-y-auto space-y-3 pt-2 pr-2">
    {history.length > 0 ? (
      history.map((e) => (
        <div
          key={e.id}
          className="text-sm p-2 bg-muted/50 rounded-md cursor-pointer hover:bg-muted"
          onClick={() => onShowDetail("cleaning", e)}
        >
          <div className="flex justify-between items-center">
            <span className="font-semibold">{e.receptionist}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(e.date).toLocaleDateString("es-CL")}
            </span>
          </div>
          <p className="text-muted-foreground text-xs mt-1">
            {e.observations || "Sin observaciones."}
          </p>
        </div>
      ))
    ) : (
      <p className="text-sm text-muted-foreground text-center py-4">
        No hay registros de limpieza.
      </p>
    )}
  </div>
);

const MaintenanceHistoryTab = ({ history = [], onShowDetail }) => {
  const priorityVariant = {
    low: "success",
    medium: "warning",
    high: "destructive",
    critical: "destructive",
  };
  return (
    <div className="max-h-60 overflow-y-auto space-y-3 pt-2 pr-2">
      {history.length > 0 ? (
        history.map((e) => (
          <div
            key={e.id}
            className="text-sm p-2 bg-muted/50 rounded-md cursor-pointer hover:bg-muted"
            onClick={() => onShowDetail("maintenance", e)}
          >
            <div className="flex justify-between items-center">
              <span className="font-semibold capitalize">
                {e.status.replace("_", " ")}
              </span>
              <Badge
                variant={priorityVariant[e.priority] || "secondary"}
                className="capitalize"
              >
                {e.priority}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs my-1">
              {e.description}
            </p>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <CalendarDaysIcon className="h-3 w-3" />
              <span>
                {new Date(e.start_date).toLocaleDateString("es-CL")} -{" "}
                {e.end_date
                  ? new Date(e.end_date).toLocaleDateString("es-CL")
                  : "Presente"}
              </span>
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No hay tareas de mantenimiento.
        </p>
      )}
    </div>
  );
};

const ReservationHistoryTab = ({ history = [], onShowDetail }) => (
  <div className="max-h-60 overflow-y-auto space-y-3 pt-2 pr-2">
    {history.length > 0 ? (
      history.map((res) => (
        <div
          key={res.reservationId}
          className="text-sm p-2 bg-muted/50 rounded-md cursor-pointer hover:bg-muted"
          onClick={() => onShowDetail("reservation", res)}
        >
          <div className="flex justify-between items-center">
            <span className="font-semibold flex items-center gap-2">
              <UserCircleIcon className="h-4 w-4" />
              {res.guestName}
            </span>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
            <CalendarDaysIcon className="h-3 w-3" />
            <span>{new Date(res.checkIn).toLocaleDateString("es-CL")}</span>
            <ArrowRightIcon className="h-3 w-3" />
            <span>{new Date(res.checkOut).toLocaleDateString("es-CL")}</span>
          </div>
        </div>
      ))
    ) : (
      <p className="text-sm text-muted-foreground text-center py-4">
        No hay historial de reservas para esta habitación.
      </p>
    )}
  </div>
);

function RoomHistory({ roomDetails, onShowDetail }) {
  const {
    currentGuest,
    cleaningHistory,
    maintenanceHistory,
    reservationHistory,
    status,
  } = roomDetails;

  const tabsConfig = useMemo(
    () => [
      {
        id: "guest",
        label: "Huésped Actual",
        shouldShow:
          !!currentGuest && (status === "occupied" || status === "pending"),
        component: <GuestTab guest={currentGuest} />,
      },
      {
        id: "history",
        label: "Historial",
        shouldShow: status === "available",
        component: (
          <ReservationHistoryTab
            history={reservationHistory}
            onShowDetail={onShowDetail}
          />
        ),
      },
      {
        id: "cleaning",
        label: "Limpieza",
        shouldShow: true,
        component: (
          <CleaningHistoryTab
            history={cleaningHistory}
            onShowDetail={onShowDetail}
          />
        ),
      },
      {
        id: "maintenance",
        label: "Mantenimiento",
        shouldShow: true,
        component: (
          <MaintenanceHistoryTab
            history={maintenanceHistory}
            onShowDetail={onShowDetail}
          />
        ),
      },
    ],
    [roomDetails, onShowDetail]
  );

  const visibleTabs = useMemo(
    () => tabsConfig.filter((tab) => tab.shouldShow),
    [tabsConfig]
  );

  const defaultTab = visibleTabs.length > 0 ? visibleTabs[0].id : undefined;

  const getGridColsClass = (count) => {
    switch (count) {
      case 1:
        return "grid-cols-1";
      case 2:
        return "grid-cols-2";
      case 3:
        return "grid-cols-3";
      case 4:
        return "grid-cols-4";
      default:
        return "grid-cols-1";
    }
  };

  if (!defaultTab) {
    return null;
  }

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList
        className={`grid w-full ${getGridColsClass(visibleTabs.length)}`}
      >
        {visibleTabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {visibleTabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id}>
          {tab.component}
        </TabsContent>
      ))}
    </Tabs>
  );
}

export default RoomHistory;
