import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import RoomBoard from "../../components/RoomBoard.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { profileService } from "@/services/profileService";
import { formatActivity } from "@/lib/activityFormatter";
import { Plus } from "lucide-react";

const ReceptionistDashboard = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const data = await profileService.getMyActivity(10);
      setActivities(data);
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('Sin actividades disponibles');
        setActivities([]);
      } else {
        console.error('Error al cargar actividades:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">
          Estado de Habitaciones
        </h1>
        <Button
          onClick={() => navigate('/reservations/new')}
          size="lg"
          className="gap-2"
        >
          <Plus className="h-5 w-5" />
          Nueva Reserva
        </Button>
      </div>

      <RoomBoard />

      <Card>
        <CardHeader>
          <CardTitle>Mis Últimas Acciones</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando actividades...</p>
          ) : activities.length > 0 ? (
            <ul className="space-y-2">
              {activities.map((activity) => (
                <li key={activity.id} className="text-sm border-b pb-2 last:border-0">
                  <span className="font-medium">{formatActivity(activity)}</span>
                  <span className="text-xs text-muted-foreground block mt-1">
                    {new Date(activity.timestamp).toLocaleString('es-CL', {
                      dateStyle: 'short',
                      timeStyle: 'short'
                    })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No hay actividades recientes</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReceptionistDashboard;