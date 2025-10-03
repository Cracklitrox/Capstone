import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import RoomBoard from "../../components/RoomBoard.jsx";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Plus } from "lucide-react";
import { profileService } from "@/services/profileService";
import { formatActivity } from "@/lib/activityFormatter";

const ReceptionistDashboard = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const data = await profileService.getMyActivity(5);
      setActivities(data);
    } catch (error) {
      if (error.response?.status === 400) {
        console.log("Sin actividades disponibles");
        setActivities([]);
      } else {
        console.error("Error al cargar actividades:", error);
      }
    } finally {
      setLoadingActivities(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">
          Estado de Habitaciones
        </h1>
        <Button
          onClick={() => navigate("/reservations/new")}
          size="lg"
          className="gap-2"
        >
          <Plus className="h-5 w-5" />
          Nueva Reserva
        </Button>
      </div>

      {/* Actividad Reciente */}
      <Card>
        <CardHeader>
          <CardTitle>Mi Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingActivities ? (
            <p className="text-sm text-muted-foreground">
              Cargando actividades...
            </p>
          ) : activities.length > 0 ? (
            <ul className="space-y-2">
              {activities.map((activity) => (
                <li
                  key={activity.id}
                  className="text-sm border-b pb-2 last:border-b-0"
                >
                  {formatActivity(activity)} {/* CORREGIDO */}
                  <span className="text-xs text-muted-foreground ml-2">
                    {new Date(activity.timestamp).toLocaleString("es-CL")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay actividades recientes
            </p>
          )}
        </CardContent>
      </Card>

      <RoomBoard />
    </div>
  );
};

export default ReceptionistDashboard;
