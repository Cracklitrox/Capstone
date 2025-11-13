import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import {
  Sparkles,
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  ClipboardCheck,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * RoomsPending Component
 *
 * Página para gestionar habitaciones pendientes:
 * - Listas para Limpieza (después de checkout)
 * - En Limpieza
 * - En Mantenimiento
 * - Reservadas (Esperando Check-in)
 */
const RoomsPending = () => {
  const [activeTab, setActiveTab] = useState('ready');
  const [readyForCleaningRooms, setReadyForCleaningRooms] = useState([]);
  const [cleaningRooms, setCleaningRooms] = useState([]);
  const [maintenanceRooms, setMaintenanceRooms] = useState([]);
  const [pendingRooms, setPendingRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingObservations, setEditingObservations] = useState({});

  // Fetch habitaciones listas para limpieza
  const fetchReadyForCleaningRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/v1/rooms/ready-for-cleaning', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al obtener habitaciones listas para limpieza');

      const data = await response.json();
      setReadyForCleaningRooms(data.rooms || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar habitaciones listas para limpieza');
    }
  };

  // Fetch habitaciones en limpieza
  const fetchCleaningRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/v1/rooms/cleaning', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al obtener habitaciones en limpieza');

      const data = await response.json();
      setCleaningRooms(data.rooms || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar habitaciones en limpieza');
    }
  };

  // Fetch habitaciones en mantenimiento
  const fetchMaintenanceRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/v1/rooms', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al obtener habitaciones');

      const data = await response.json();
      const maintenance = data.filter((room) => room.status === 'maintenance');
      setMaintenanceRooms(maintenance);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar habitaciones en mantenimiento');
    }
  };

  // Fetch habitaciones pendientes (reservadas)
  const fetchPendingRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/v1/rooms', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al obtener habitaciones');

      const data = await response.json();
      const pending = data.filter((room) => room.status === 'pending');
      setPendingRooms(pending);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar habitaciones pendientes');
    }
  };

  // Completar limpieza
  const handleCompleteCleaning = async (roomId, observations) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(
        `http://localhost:3001/api/v1/rooms/${roomId}/complete-cleaning`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ observations }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al completar limpieza');
      }

      const data = await response.json();

      toast.success('Limpieza completada exitosamente', {
        description: `Habitación ${data.roomNumber} ahora está disponible`,
      });

      // Recargar datos
      fetchCleaningRooms();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al completar limpieza', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Cambiar estado de habitación (para habitaciones sin cleaning_record)
  const handleChangeRoomStatus = async (roomId, newStatus, roomNumber) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(
        `http://localhost:3001/api/v1/rooms/${roomId}/status`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al cambiar estado');
      }

      toast.success('Estado actualizado', {
        description: `Habitación ${roomNumber} ahora está ${
          newStatus === 'available' ? 'disponible' : newStatus
        }`,
      });

      // Recargar datos
      fetchCleaningRooms();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cambiar estado', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Actualizar observaciones
  const handleUpdateObservations = async (roomId, observations) => {
    // Validar que no esté vacío
    if (!observations || observations.trim() === '') {
      setEditingObservations((prev) => ({ ...prev, [roomId]: false }));
      return; // No hacer nada si está vacío
    }

    try {
      const token = localStorage.getItem('token');

      const response = await fetch(
        `http://localhost:3001/api/v1/rooms/${roomId}/cleaning-observations`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ observations }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar observaciones');
      }

      toast.success('Observaciones actualizadas');
      setEditingObservations((prev) => ({ ...prev, [roomId]: false }));
      fetchCleaningRooms();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar observaciones');
    }
  };

  // Iniciar limpieza manual (enviar habitación a limpieza)
  const handleStartCleaning = async (roomId, roomNumber) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(
        `http://localhost:3001/api/v1/rooms/${roomId}/start-cleaning`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al iniciar limpieza');
      }

      const data = await response.json();

      toast.success('Limpieza iniciada', {
        description: `Habitación ${roomNumber} enviada a limpieza`,
      });

      // Recargar datos
      fetchReadyForCleaningRooms();
      fetchCleaningRooms();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al iniciar limpieza', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calcular tiempo en limpieza
  const getCleaningDuration = (startedAt) => {
    const now = new Date();
    const start = new Date(startedAt);
    const diffMinutes = Math.floor((now - start) / (1000 * 60));

    if (diffMinutes < 60) {
      return { text: `${diffMinutes} min`, color: 'text-green-600' };
    } else if (diffMinutes < 120) {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return { text: `${hours}h ${minutes}m`, color: 'text-yellow-600' };
    } else {
      const hours = Math.floor(diffMinutes / 60);
      return { text: `${hours}h`, color: 'text-red-600' };
    }
  };

  // Cargar datos al montar
  useEffect(() => {
    fetchReadyForCleaningRooms();
    fetchCleaningRooms();
    fetchMaintenanceRooms();
    fetchPendingRooms();

    // Auto-refresh cada 2 minutos
    const interval = setInterval(() => {
      if (activeTab === 'ready') fetchReadyForCleaningRooms();
      if (activeTab === 'cleaning') fetchCleaningRooms();
      if (activeTab === 'maintenance') fetchMaintenanceRooms();
      if (activeTab === 'pending') fetchPendingRooms();
    }, 120000);

    return () => clearInterval(interval);
  }, [activeTab]);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Habitaciones Pendientes</h1>
        <p className="text-muted-foreground mt-2">
          Gestión de habitaciones en limpieza, mantenimiento y reservadas
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ready" className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" />
            <span>Listas para Limpieza ({readyForCleaningRooms.length})</span>
          </TabsTrigger>
          <TabsTrigger value="cleaning" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>En Limpieza ({cleaningRooms.length})</span>
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            <span>En Mantenimiento ({maintenanceRooms.length})</span>
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Reservadas ({pendingRooms.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 0: Listas para Limpieza */}
        <TabsContent value="ready" className="mt-6">
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              ℹ️ Estas habitaciones han completado el checkout y están listas para ser enviadas a limpieza.
              La limpieza generalmente comienza a las <strong>09:00 hrs</strong> y se completa hasta las <strong>11:00 hrs</strong>.
            </p>
          </div>

          {readyForCleaningRooms.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No hay habitaciones listas para limpieza
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {readyForCleaningRooms.map((room) => (
                <Card key={room.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">Habitación {room.number}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {room.type} • Piso {room.floor}
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-blue-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium">Checkout Completado</span>
                    </div>

                    {room.lastGuest && (
                      <div className="space-y-1 p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{room.lastGuest}</span>
                        </div>
                        {room.reservationCode && (
                          <p className="text-xs text-muted-foreground ml-6">
                            Código: {room.reservationCode}
                          </p>
                        )}
                        {room.lastCheckout && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground ml-6">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {new Date(room.lastCheckout).toLocaleDateString('es-CL')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      onClick={() => handleStartCleaning(room.id, room.number)}
                      disabled={isLoading}
                      className="w-full"
                      variant="default"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Enviar a Limpieza
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 1: En Limpieza */}
        <TabsContent value="cleaning" className="mt-6">
          <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg">
            <p className="text-sm text-purple-900 dark:text-purple-100">
              ✨ Horario de limpieza: generalmente de <strong>09:00 hrs</strong> a <strong>11:00 hrs</strong>
            </p>
          </div>

          {cleaningRooms.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No hay habitaciones en limpieza</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cleaningRooms.map((room) => {
                const duration = room.cleaningRecord
                  ? getCleaningDuration(room.cleaningRecord.startedAt)
                  : null;

                return (
                  <Card key={room.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">
                            Habitación {room.number}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {room.type} • Piso {room.floor}
                          </p>
                        </div>
                        {duration && (
                          <div className="text-right">
                            <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                            <p className={`text-sm font-semibold ${duration.color}`}>
                              {duration.text}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {room.cleaningRecord ? (
                        <>
                          <div className="text-sm text-muted-foreground">
                            <User className="w-4 h-4 inline mr-1" />
                            {room.cleaningRecord.receptionistName}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`obs-${room.id}`} className="text-sm">
                              Observaciones
                            </Label>
                            {editingObservations[room.id] ? (
                              <>
                                <Textarea
                                  id={`obs-${room.id}`}
                                  defaultValue={room.cleaningRecord.observations || ''}
                                  placeholder="Agregar observaciones..."
                                  rows={2}
                                  maxLength={250}
                                  onBlur={(e) =>
                                    handleUpdateObservations(room.id, e.target.value)
                                  }
                                />
                                <p className="text-xs text-muted-foreground">
                                  Presiona fuera del campo para guardar
                                </p>
                              </>
                            ) : (
                              <div
                                className="text-sm p-2 bg-muted rounded cursor-pointer hover:bg-muted/80"
                                onClick={() =>
                                  setEditingObservations((prev) => ({
                                    ...prev,
                                    [room.id]: true,
                                  }))
                                }
                              >
                                {room.cleaningRecord.observations || (
                                  <span className="text-muted-foreground italic">
                                    Click para agregar...
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <Button
                            onClick={() =>
                              handleCompleteCleaning(
                                room.id,
                                room.cleaningRecord.observations
                              )
                            }
                            disabled={isLoading}
                            className="w-full bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Marcar como Limpia
                          </Button>
                        </>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                              <div>
                                <p className="text-sm text-yellow-800 font-medium">
                                  Sin registro de limpieza
                                </p>
                                <p className="text-xs text-yellow-700 mt-1">
                                  Esta habitación está marcada como "en limpieza" pero no
                                  tiene un registro activo.
                                </p>
                              </div>
                            </div>
                          </div>

                          <Button
                            onClick={() =>
                              handleChangeRoomStatus(room.id, 'available', room.number)
                            }
                            disabled={isLoading}
                            variant="outline"
                            className="w-full"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Marcar como Disponible
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: En Mantenimiento */}
        <TabsContent value="maintenance" className="mt-6">
          {maintenanceRooms.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Wrench className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No hay habitaciones en mantenimiento
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {maintenanceRooms.map((room) => (
                <Card key={room.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">Habitación {room.number}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {room.type} • Piso {room.floor}
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-orange-600">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-medium">En Mantenimiento</span>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Para marcar como reparada, ve al Tablero de Estados
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: Reservadas (Esperando Check-in) */}
        <TabsContent value="pending" className="mt-6">
          {pendingRooms.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No hay habitaciones reservadas</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingRooms.map((room) => (
                <Card key={room.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">Habitación {room.number}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {room.type} • Piso {room.floor}
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {room.reservation ? (
                      <>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {room.reservation.guest?.first_name}{' '}
                              {room.reservation.guest?.paternal_last_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>
                              Check-in:{' '}
                              {new Date(
                                room.reservation.check_in_date
                              ).toLocaleDateString('es-CL')}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800">
                            Esperando check-in del huésped
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Sin información de reserva
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RoomsPending;
