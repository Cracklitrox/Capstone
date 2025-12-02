import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Home,
  Loader2,
  RefreshCw,
  Filter,
  CheckCircle2,
  Clock,
  Users,
  XCircle,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { RoomCardSkeleton } from '../../components/ui/Skeleton';
import { toast } from 'sonner';

// Configuración de estados (fuera del componente para evitar recreación)
const STATUS_CONFIG = {
  available: {
    label: 'Disponible',
    icon: CheckCircle2,
    color: 'bg-green-100 text-green-800 border-green-300',
    badgeColor: 'bg-green-500',
  },
  pending: {
    label: 'Pendiente',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    badgeColor: 'bg-yellow-500',
  },
  occupied: {
    label: 'Ocupado',
    icon: Users,
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    badgeColor: 'bg-blue-500',
  },
  unavailable: {
    label: 'No Disponible',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-300',
    badgeColor: 'bg-red-500',
  },
  cleaning: {
    label: 'Limpieza',
    icon: Sparkles,
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    badgeColor: 'bg-purple-500',
  },
  maintenance: {
    label: 'Mantenimiento',
    icon: Wrench,
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    badgeColor: 'bg-orange-500',
  },
};

/**
 * RoomStatusBoard Component
 *
 * Tablero visual tipo Kanban mostrando habitaciones agrupadas por estado
 * Permite cambios rápidos de estado con drag & drop visual
 */
const RoomStatusBoard = () => {
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  // ============================================================================
  // Memoized Functions (useCallback) - Performance Optimization
  // ============================================================================

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const [roomsRes, typesRes] = await Promise.all([
        fetch('http://localhost:3001/api/v1/rooms', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:3001/api/v1/rooms/types', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!roomsRes.ok || !typesRes.ok) {
        throw new Error('Error al cargar habitaciones');
      }

      const roomsData = await roomsRes.json();
      const typesData = await typesRes.json();

      setRooms(roomsData.rooms || roomsData);
      setRoomTypes(typesData.roomTypes || typesData);
    } catch (error) {
      toast.error('Error al cargar habitaciones');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleStatusChange = useCallback(async (roomId, newStatus) => {
    try {
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

      toast.success('Estado actualizado correctamente');
      fetchRooms();
    } catch (error) {
      toast.error('Error al cambiar estado', {
        description: error.message,
      });
    }
  }, [fetchRooms]);

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 300000); // 5 min
    return () => clearInterval(interval);
  }, [fetchRooms]);

  // ============================================================================
  // Computed Values (useMemo) - Performance Optimization
  // ============================================================================

  // Filtrado de habitaciones optimizado
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      if (selectedFloor !== 'all' && room.floor !== parseInt(selectedFloor)) {
        return false;
      }
      if (selectedType !== 'all' && room.room_type_id !== parseInt(selectedType)) {
        return false;
      }
      return true;
    });
  }, [rooms, selectedFloor, selectedType]);

  // Agrupación por estado optimizada
  const groupedRooms = useMemo(() => {
    return Object.keys(STATUS_CONFIG).reduce((acc, status) => {
      acc[status] = filteredRooms.filter((room) => room.status === status);
      return acc;
    }, {});
  }, [filteredRooms]);

  // Pisos únicos optimizado
  const floors = useMemo(() => {
    return [...new Set(rooms.map((r) => r.floor).filter(Boolean))].sort(
      (a, b) => a - b
    );
  }, [rooms]);

  if (loading && rooms.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Tablero de Estados de Habitaciones
          </h1>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.keys(STATUS_CONFIG).map((status) => (
            <div key={status} className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-card border rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${STATUS_CONFIG[status].badgeColor}`} />
                  <span className="font-semibold">{STATUS_CONFIG[status].label}</span>
                </div>
              </div>
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <RoomCardSkeleton key={index} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Tablero de Estados de Habitaciones
          </h1>
          <p className="text-muted-foreground">
            {filteredRooms.length} habitación(es) en total
          </p>
        </div>
        <Button
          onClick={fetchRooms}
          variant="outline"
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros:</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Piso:</span>
          <Select value={selectedFloor} onValueChange={setSelectedFloor}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {floors.map((floor) => (
                <SelectItem key={floor} value={floor.toString()}>
                  Piso {floor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Tipo:</span>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {roomTypes.map((type) => (
                <SelectItem key={type.id} value={type.id.toString()}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tablero Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const Icon = config.icon;
          const roomsInStatus = groupedRooms[status] || [];

          return (
            <div key={status} className="space-y-3">
              {/* Header de columna */}
              <div className="flex items-center justify-between p-3 bg-card border rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${config.badgeColor}`} />
                  <Icon className="w-5 h-5" />
                  <span className="font-semibold">{config.label}</span>
                </div>
                <Badge variant="secondary">{roomsInStatus.length}</Badge>
              </div>

              {/* Cards de habitaciones */}
              <div className="space-y-2 min-h-[200px]">
                {roomsInStatus.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                    No hay habitaciones en este estado
                  </div>
                ) : (
                  roomsInStatus.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      statusConfig={STATUS_CONFIG}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * RoomCard Component
 * Tarjeta individual de habitación con selector de estado
 */
const RoomCard = ({ room, statusConfig, onStatusChange }) => {
  const [isChanging, setIsChanging] = useState(false);
  const [showStatusSelector, setShowStatusSelector] = useState(false);

  const handleChangeStatus = async (newStatus) => {
    if (newStatus === room.status) {
      setShowStatusSelector(false);
      return;
    }

    setIsChanging(true);
    await onStatusChange(room.id, newStatus);
    setIsChanging(false);
    setShowStatusSelector(false);
  };

  const currentConfig = statusConfig[room.status];
  const Icon = currentConfig?.icon || Home;

  return (
    <div
      className={`p-3 border-2 rounded-lg transition-all hover:shadow-md ${currentConfig?.color || 'bg-gray-100'}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <span className="font-bold text-lg">#{room.room_number}</span>
        </div>
        {room.floor && (
          <Badge variant="outline" className="text-xs">
            Piso {room.floor}
          </Badge>
        )}
      </div>

      <div className="space-y-1 text-sm mb-3">
        <p className="font-medium">{room.room_types?.name || 'N/A'}</p>
        <p className="text-xs text-muted-foreground">
          Capacidad: {room.capacity || 0} personas
        </p>
      </div>

      {showStatusSelector ? (
        <div className="space-y-1">
          <p className="text-xs font-medium mb-2">Cambiar a:</p>
          {Object.entries(statusConfig).map(([status, config]) => {
            if (status === room.status) return null;
            const StatusIcon = config.icon;
            return (
              <button
                key={status}
                onClick={() => handleChangeStatus(status)}
                disabled={isChanging}
                className="w-full px-2 py-1.5 text-xs text-left rounded flex items-center gap-2 hover:bg-background/50 transition"
              >
                <StatusIcon className="w-3 h-3" />
                {config.label}
              </button>
            );
          })}
          <button
            onClick={() => setShowStatusSelector(false)}
            className="w-full px-2 py-1 text-xs text-center rounded hover:bg-background/50 transition mt-2"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <Button
          onClick={() => setShowStatusSelector(true)}
          disabled={isChanging}
          variant="outline"
          size="sm"
          className="w-full text-xs"
        >
          {isChanging ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
              Cambiando...
            </>
          ) : (
            'Cambiar Estado'
          )}
        </Button>
      )}
    </div>
  );
};

export default RoomStatusBoard;
