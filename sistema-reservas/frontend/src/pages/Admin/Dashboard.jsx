import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import RoomBoard from "../../components/rooms/RoomBoard.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/Dialog";
import { profileService } from "@/services/profileService";
import { formatActivity } from "@/lib/activityFormatter";
import { Plus, History, ChevronLeft, ChevronRight } from "lucide-react";

const ReceptionistDashboard = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allActivities, setAllActivities] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const data = await profileService.getMyActivity(5); // Changed to 5
      setActivities(data);
    } catch (error) {
      if (error.response?.status === 400) {
        setActivities([]);
      } else {
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAllTodayActivities = async () => {
    setLoadingAll(true);
    try {
      // Fetch maximum allowed (50) to get today's activities
      const data = await profileService.getMyActivity(50);

      // Filter to only today's activities
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayActivities = data.filter(activity => {
        const activityDate = new Date(activity.timestamp);
        activityDate.setHours(0, 0, 0, 0);
        return activityDate.getTime() === today.getTime();
      });

      setAllActivities(todayActivities);
      setCurrentPage(1); // Reset to first page
    } catch (error) {
      setAllActivities([]);
    } finally {
      setLoadingAll(false);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    loadAllTodayActivities();
  };

  // Pagination calculations
  const totalPages = Math.ceil(allActivities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentActivities = allActivities.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
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
          <div className="flex items-center justify-between">
            <CardTitle>Mis Últimas Acciones</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenModal}
              className="gap-2"
            >
              <History className="h-4 w-4" />
              Ver Todos
            </Button>
          </div>
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

      {/* Modal for all today's activities */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Todas mis Acciones de Hoy</DialogTitle>
            <DialogDescription>
              Historial completo de actividades del día {new Date().toLocaleDateString('es-CL')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {loadingAll ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Cargando actividades...
              </p>
            ) : allActivities.length > 0 ? (
              <>
                <ul className="space-y-3">
                  {currentActivities.map((activity) => (
                    <li
                      key={activity.id}
                      className="text-sm border-b pb-3 last:border-0 hover:bg-muted/50 p-2 rounded transition-colors"
                    >
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

                {/* Pagination controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                      className="gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>

                    <span className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className="gap-2"
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay actividades registradas para hoy
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReceptionistDashboard;