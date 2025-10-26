import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Users, Home, Zap, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const Step2_5GuestAssignment = ({ data, onUpdate, onNext, onBack }) => {
  // Estado local de asignaciones
  const [roomGuestAssignments, setRoomGuestAssignments] = useState([]);

  // Inicializar asignaciones al montar
  useEffect(() => {
    // Si ya hay asignaciones previas, usarlas
    if (data.roomGuestAssignments && data.roomGuestAssignments.length > 0) {
      setRoomGuestAssignments(data.roomGuestAssignments);
    } else {
      // Inicializar con habitaciones vacías
      const initialAssignments = data.selectedRooms.map(room => ({
        roomId: room.id,
        roomNumber: room.number,
        roomType: room.type,
        capacity: room.capacity || 2,
        guestIds: []
      }));
      setRoomGuestAssignments(initialAssignments);
    }
  }, []);

  // Obtener lista de TODOS los huéspedes (usamos IDs temporales)
  const getAllGuests = () => {
    const guests = [];
    let idCounter = 1;

    // Huésped principal (temporal)
    guests.push({
      id: `guest-${idCounter++}`,
      name: 'Huésped Principal',
      isMain: true
    });

    // Huéspedes adicionales (temporales)
    for (let i = 2; i <= data.guests; i++) {
      guests.push({
        id: `guest-${idCounter++}`,
        name: `Huésped ${i}`,
        isMain: false
      });
    }

    return guests;
  };

  const allGuests = getAllGuests();

  // Obtener IDs de huéspedes ya asignados
  const getAssignedGuestIds = () => {
    return roomGuestAssignments.flatMap(room => room.guestIds);
  };

  // Verificar si un huésped está asignado
  const isGuestAssigned = (guestId) => {
    return getAssignedGuestIds().includes(guestId);
  };

  // Asignar huésped a habitación
  const assignGuestToRoom = (roomId, guestId) => {
    setRoomGuestAssignments(prev =>
      prev.map(room => {
        if (room.roomId === roomId) {
          // Verificar capacidad
          if (room.guestIds.length >= room.capacity) {
            toast.error(`Habitación ${room.roomNumber} está llena (capacidad: ${room.capacity})`);
            return room;
          }

          // Agregar huésped
          return {
            ...room,
            guestIds: [...room.guestIds, guestId]
          };
        }
        return room;
      })
    );
  };

  // Remover huésped de habitación
  const removeGuestFromRoom = (roomId, guestId) => {
    setRoomGuestAssignments(prev =>
      prev.map(room => {
        if (room.roomId === roomId) {
          return {
            ...room,
            guestIds: room.guestIds.filter(id => id !== guestId)
          };
        }
        return room;
      })
    );
  };

  // Auto-asignar huéspedes por capacidad
  const autoAssignGuests = () => {
    const newAssignments = data.selectedRooms.map(room => ({
      roomId: room.id,
      roomNumber: room.number,
      roomType: room.type,
      capacity: room.capacity || 2,
      guestIds: []
    }));

    let guestIndex = 0;

    // PASO 1: Asignar 1 huésped a cada habitación primero
    for (const assignment of newAssignments) {
      if (guestIndex < allGuests.length) {
        assignment.guestIds.push(allGuests[guestIndex].id);
        guestIndex++;
      }
    }

    // PASO 2: Completar habitaciones hasta capacidad
    for (const assignment of newAssignments) {
      while (assignment.guestIds.length < assignment.capacity && guestIndex < allGuests.length) {
        assignment.guestIds.push(allGuests[guestIndex].id);
        guestIndex++;
      }
    }

    setRoomGuestAssignments(newAssignments);
    toast.success('Huéspedes asignados automáticamente');
  };

  // Validar que todos los huéspedes estén asignados
  const areAllGuestsAssigned = () => {
    const assignedCount = getAssignedGuestIds().length;
    return assignedCount === allGuests.length;
  };

  // Continuar al siguiente paso
  const handleNext = () => {
    if (!areAllGuestsAssigned()) {
      toast.error('Debe asignar todos los huéspedes a las habitaciones');
      return;
    }

    // ✅ VALIDACIÓN: Verificar si hay habitaciones vacías
    const emptyRooms = roomGuestAssignments.filter(room => room.guestIds.length === 0);

    if (emptyRooms.length > 0) {
      const roomNumbers = emptyRooms.map(r => r.roomNumber).join(', ');
      toast.error(
        `Las habitaciones ${roomNumbers} no tienen huéspedes asignados. ` +
        `Solo se guardarán las habitaciones con huéspedes.`,
        { duration: 5000 }
      );
    }

    // ✅ Filtrar solo habitaciones CON huéspedes
    const roomsWithGuests = roomGuestAssignments.filter(room => room.guestIds.length > 0);

    // Guardar asignaciones en el estado global (solo habitaciones con huéspedes)
    onUpdate({ roomGuestAssignments: roomsWithGuests });
    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Asignar Huéspedes a Habitaciones</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Distribuya los {data.guests} huéspedes en las {data.selectedRooms.length} habitaciones seleccionadas
          </p>
        </div>
        <Button
          onClick={autoAssignGuests}
          variant="outline"
          size="sm"
        >
          <Zap className="h-4 w-4 mr-2" />
          Auto-asignar
        </Button>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-medium">¿Cómo funciona?</p>
          <p className="mt-1">
            Haga clic en un huésped no asignado y luego en la habitación deseada.
            Puede usar "Auto-asignar" para una distribución automática por capacidad.
          </p>
        </div>
      </div>

      {/* Huéspedes no asignados */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Huéspedes Disponibles ({allGuests.filter(g => !isGuestAssigned(g.id)).length}/{allGuests.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {allGuests.map(guest => {
              const isAssigned = isGuestAssigned(guest.id);
              return (
                <Badge
                  key={guest.id}
                  variant={isAssigned ? "secondary" : "default"}
                  className={`cursor-pointer ${isAssigned ? 'opacity-50' : 'hover:bg-primary/80'}`}
                >
                  {guest.name}
                  {guest.isMain && ' (Principal)'}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Habitaciones */}
      <div className="space-y-4">
        {roomGuestAssignments.map(room => {
          const isFull = room.guestIds.length >= room.capacity;
          const isEmpty = room.guestIds.length === 0;

          return (
            <Card key={room.roomId} className={isEmpty ? 'border-orange-200' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Habitación {room.roomNumber} - {room.roomType}</p>
                      <p className="text-sm text-muted-foreground">
                        Capacidad: {room.guestIds.length}/{room.capacity}
                      </p>
                    </div>
                  </div>
                  {isFull && (
                    <Badge variant="secondary">Completa</Badge>
                  )}
                  {isEmpty && (
                    <Badge variant="destructive">Vacía</Badge>
                  )}
                </div>

                {/* Huéspedes asignados */}
                {room.guestIds.length > 0 ? (
                  <div className="space-y-2">
                    {room.guestIds.map(guestId => {
                      const guest = allGuests.find(g => g.id === guestId);
                      return (
                        <div
                          key={guestId}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                        >
                          <span className="text-sm">
                            {guest?.name}
                            {guest?.isMain && ' (Principal)'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeGuestFromRoom(room.roomId, guestId)}
                            className="h-7 text-xs"
                          >
                            Quitar
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground border-2 border-dashed rounded-md">
                    No hay huéspedes asignados
                  </div>
                )}

                {/* Agregar huésped */}
                {!isFull && (
                  <div className="mt-3">
                    <select
                      className="w-full p-2 border rounded-md text-sm"
                      onChange={(e) => {
                        if (e.target.value) {
                          assignGuestToRoom(room.roomId, e.target.value);
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>+ Agregar huésped</option>
                      {allGuests
                        .filter(g => !isGuestAssigned(g.id))
                        .map(guest => (
                          <option key={guest.id} value={guest.id}>
                            {guest.name}
                            {guest.isMain && ' (Principal)'}
                          </option>
                        ))
                      }
                    </select>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Volver
        </Button>
        <Button
          onClick={handleNext}
          disabled={!areAllGuestsAssigned()}
        >
          Continuar a Servicios
        </Button>
      </div>
    </div>
  );
};

export default Step2_5GuestAssignment;
