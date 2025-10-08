import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/services/authContext.jsx';
import { guestHistoryService } from '@/services/guestHistory.js';
import { format, parseISO, differenceInYears, differenceInMonths, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

// Importar componentes UI
import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Separator } from "@/components/ui/separator.jsx";

// Importar iconos
import { 
  MagnifyingGlassIcon, 
  UserIcon, 
  CalendarIcon,
  HomeIcon,
  CurrencyDollarIcon,
  EyeIcon,
  XCircleIcon 
} from '@heroicons/react/24/outline';

const GuestHistory = () => {
  const { token } = useAuth();
  
  // Estados principales
  const [guests, setGuests] = useState([]);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [guestProfile, setGuestProfile] = useState(null);
  const [guestReservations, setGuestReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Estados para búsqueda de huéspedes
  const [searchTerm, setSearchTerm] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [guestsMeta, setGuestsMeta] = useState({ page: 1, totalPages: 1 });
  
  // Estados para el modal de perfil
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Estados para historial de reservas
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservationsMeta, setReservationsMeta] = useState({ page: 1, totalPages: 1 });
  const [reservationFilters, setReservationFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
    page: 1,
  });

  // Buscar huéspedes
  const searchGuests = useCallback(async (page = 1) => {
    if (!token) return;
    
    setSearchLoading(true);
    setError(null);
    
    try {
      const response = await guestHistoryService.searchAllGuests(searchTerm, page, 20);
      setGuests(response.data || []);
      setGuestsMeta(response.meta || { page: 1, totalPages: 1 });
    } catch (err) {
      setError(err.message);
      setGuests([]);
    } finally {
      setSearchLoading(false);
    }
  }, [token, searchTerm]);

  // Cargar perfil del huésped
  const loadGuestProfile = async (guestId) => {
    setProfileLoading(true);
    try {
      const response = await guestHistoryService.getGuestProfile(guestId);
      if (response.found) {
        setGuestProfile(response.guest);
      } else {
        setError('Huésped no encontrado');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  // Cargar reservas del huésped
  const loadGuestReservations = async (guestId, filters = {}) => {
    setReservationsLoading(true);
    try {
      const response = await guestHistoryService.getGuestReservations(guestId, {
        ...filters,
        page: filters.page || 1,
        limit: 10,
      });
      setGuestReservations(response.data || []);
      setReservationsMeta(response.meta || { page: 1, totalPages: 1 });
    } catch (err) {
      setError(err.message);
      setGuestReservations([]);
    } finally {
      setReservationsLoading(false);
    }
  };

  // Manejar selección de huésped
  const handleSelectGuest = async (guest) => {
    setSelectedGuest(guest);
    setIsModalOpen(true);
    await loadGuestProfile(guest.id);
    await loadGuestReservations(guest.id, reservationFilters);
  };

  // Calcular edad detallada
  const calculateDetailedAge = (birthDate) => {
    if (!birthDate) return 'No disponible';
    
    const birth = parseISO(birthDate);
    const now = new Date();
    
    const years = differenceInYears(now, birth);
    const monthsTotal = differenceInMonths(now, birth);
    const months = monthsTotal - (years * 12);
    
    // Calcular días restantes
    const birthThisYear = new Date(birth);
    birthThisYear.setFullYear(now.getFullYear());
    birthThisYear.setMonth(birth.getMonth() + months);
    
    const days = differenceInDays(now, birthThisYear);
    
    let ageString = '';
    if (years > 0) ageString += `${years} año${years !== 1 ? 's' : ''}`;
    if (months > 0) ageString += `${ageString ? ', ' : ''}${months} mes${months !== 1 ? 'es' : ''}`;
    if (days > 0) ageString += `${ageString ? ', ' : ''}${days} día${days !== 1 ? 's' : ''}`;
    
    return ageString || '0 días';
  };

  // Formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(amount);
  };

  // Formatear fecha
  const formatDate = (date) => {
    return format(parseISO(date), 'dd/MM/yyyy', { locale: es });
  };

  // Obtener variant de estado de reserva
  const getStatusVariant = (status) => {
    const variants = {
      'completed': 'default',
      'confirmed': 'secondary',
      'pending': 'outline',
      'cancelled': 'destructive',
    };
    return variants[status] || 'outline';
  };

  // Traducciones de estado
  const statusTranslations = {
    'completed': 'Completada',
    'confirmed': 'Confirmada',
    'pending': 'Pendiente',
    'cancelled': 'Cancelada',
  };

  // Efecto para búsqueda automática
  useEffect(() => {
    const timer = setTimeout(() => {
      searchGuests(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchGuests]);

  // Efecto para actualizar reservas cuando cambian los filtros
  useEffect(() => {
    if (selectedGuest) {
      loadGuestReservations(selectedGuest.id, reservationFilters);
    }
  }, [reservationFilters, selectedGuest]);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Historial de Huéspedes</h1>
      </div>

      {/* Panel de búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MagnifyingGlassIcon className="h-6 w-6" />
            Buscar Huésped
          </CardTitle>
          <CardDescription>
            Busca por RUT, pasaporte, nombre o email del huésped
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Ingresa RUT, nombre, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button 
              onClick={() => searchGuests(1)}
              disabled={searchLoading}
            >
              {searchLoading ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados de búsqueda */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {searchLoading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Buscando huéspedes...</p>
          </CardContent>
        </Card>
      ) : guests.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Resultados de búsqueda</CardTitle>
            <CardDescription>
              {guestsMeta.totalCount || guests.length} huésped{(guestsMeta.totalCount || guests.length) !== 1 ? 'es' : ''} encontrado{(guestsMeta.totalCount || guests.length) !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>RUT/Pasaporte</TableHead>
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Reservas</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guests.map((guest) => (
                  <TableRow key={guest.id}>
                    <TableCell className="font-mono">
                      {guest.identificationNumber}
                    </TableCell>
                    <TableCell>{guest.fullName}</TableCell>
                    <TableCell>{guest.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {guest.totalReservations} reserva{guest.totalReservations !== 1 ? 's' : ''}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {guest.createdAt ? formatDate(guest.createdAt) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectGuest(guest)}
                      >
                        <EyeIcon className="h-4 w-4 mr-2" />
                        Ver Historial
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Paginación */}
            {guestsMeta.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!guestsMeta.hasPrevPage}
                  onClick={() => searchGuests(guestsMeta.page - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {guestsMeta.page} de {guestsMeta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!guestsMeta.hasNextPage}
                  onClick={() => searchGuests(guestsMeta.page + 1)}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : searchTerm && !searchLoading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No se encontraron huéspedes con el término "{searchTerm}"
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Modal de perfil del huésped */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Historial de {selectedGuest?.fullName}
            </DialogTitle>
            <DialogDescription>
              {selectedGuest?.identificationNumber}
            </DialogDescription>
          </DialogHeader>

          {profileLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando perfil...</p>
            </div>
          ) : guestProfile ? (
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">Información Personal</TabsTrigger>
                <TabsTrigger value="reservations">Historial de Reservas</TabsTrigger>
              </TabsList>

              {/* Tab 1: Información Personal */}
              <TabsContent value="profile" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Información básica */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Datos Personales</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Nombre Completo</Label>
                        <p className="font-medium">
                          {guestProfile.firstName} {guestProfile.paternalLastName} {guestProfile.maternalLastName}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">RUT/Pasaporte</Label>
                        <p className="font-mono">{guestProfile.identificationNumber}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <p>{guestProfile.email}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Teléfono</Label>
                        <p>{guestProfile.phoneNumber || 'No disponible'}</p>
                      </div>
                      {guestProfile.birthDate && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Edad</Label>
                          <p className="font-medium text-primary">
                            {calculateDetailedAge(guestProfile.birthDate)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Nacido el {formatDate(guestProfile.birthDate)}
                          </p>
                        </div>
                      )}
                      {guestProfile.gender && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Género</Label>
                          <p>{guestProfile.gender === 'male' ? 'Masculino' : guestProfile.gender === 'female' ? 'Femenino' : 'Otro'}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Ubicación y detalles */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Ubicación y Preferencias</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">País</Label>
                        <p>{guestProfile.country || 'No disponible'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Región</Label>
                        <p>{guestProfile.region || 'No disponible'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Ciudad</Label>
                        <p>{guestProfile.city || 'No disponible'}</p>
                      </div>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground">Viaja con niños</Label>
                        <p>{guestProfile.travelsWithChildren ? 'Sí' : 'No'}</p>
                      </div>
                      {guestProfile.childrenUnderFour > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Niños menores de 4 años</Label>
                          <p>{guestProfile.childrenUnderFour}</p>
                        </div>
                      )}
                      {guestProfile.specialRequests && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Solicitudes especiales</Label>
                          <p className="text-sm">{guestProfile.specialRequests}</p>
                        </div>
                      )}
                      {guestProfile.observations && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Observaciones</Label>
                          <p className="text-sm">{guestProfile.observations}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Estadísticas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Estadísticas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold text-primary">
                          {guestProfile.stats.totalReservations}
                        </p>
                        <p className="text-sm text-muted-foreground">Total Reservas</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">
                          {guestProfile.stats.completedReservations}
                        </p>
                        <p className="text-sm text-muted-foreground">Completadas</p>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(guestProfile.stats.totalSpent)}
                        </p>
                        <p className="text-sm text-muted-foreground">Total Gastado</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Información del sistema */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Información del Sistema</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Fecha de registro</Label>
                      <p>{guestProfile.createdAt ? formatDate(guestProfile.createdAt) : 'No disponible'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Último acceso</Label>
                      <p>{guestProfile.lastLoginAt ? formatDate(guestProfile.lastLoginAt) : 'Nunca'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Estado</Label>
                      <Badge variant={guestProfile.status === 'active' ? 'default' : 'secondary'}>
                        {guestProfile.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 2: Historial de Reservas */}
              <TabsContent value="reservations" className="space-y-4">
                {/* Filtros para reservas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Filtros</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Estado</Label>
                        <Select
                          value={reservationFilters.status}
                          onValueChange={(value) => 
                            setReservationFilters(prev => ({ ...prev, status: value === 'all' ? '' : value, page: 1 }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            <SelectItem value="completed">Completadas</SelectItem>
                            <SelectItem value="confirmed">Confirmadas</SelectItem>
                            <SelectItem value="pending">Pendientes</SelectItem>
                            <SelectItem value="cancelled">Canceladas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Fecha desde</Label>
                        <Input
                          type="date"
                          value={reservationFilters.startDate}
                          onChange={(e) => 
                            setReservationFilters(prev => ({ ...prev, startDate: e.target.value, page: 1 }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Fecha hasta</Label>
                        <Input
                          type="date"
                          value={reservationFilters.endDate}
                          onChange={(e) => 
                            setReservationFilters(prev => ({ ...prev, endDate: e.target.value, page: 1 }))
                          }
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          onClick={() => setReservationFilters({ status: '', startDate: '', endDate: '', page: 1 })}
                        >
                          <XCircleIcon className="h-4 w-4 mr-2" />
                          Limpiar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Lista de reservas */}
                {reservationsLoading ? (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground">Cargando reservas...</p>
                    </CardContent>
                  </Card>
                ) : guestReservations.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Historial de Reservas</CardTitle>
                      <CardDescription>
                        {reservationsMeta.totalCount || guestReservations.length} reserva{(reservationsMeta.totalCount || guestReservations.length) !== 1 ? 's' : ''} encontrada{(reservationsMeta.totalCount || guestReservations.length) !== 1 ? 's' : ''}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {guestReservations.map((reservation) => (
                        <Card key={reservation.id} className="border-l-4 border-l-primary">
                          <CardContent className="pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Información básica */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant={getStatusVariant(reservation.status)}>
                                    {statusTranslations[reservation.status] || reservation.status}
                                  </Badge>
                                  <span className="font-mono text-sm">{reservation.code}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <CalendarIcon className="h-4 w-4" />
                                  <span>
                                    {formatDate(reservation.checkInDate)} - {formatDate(reservation.checkOutDate)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <UserIcon className="h-4 w-4" />
                                  <span>{reservation.guestCount} huésped{reservation.guestCount !== 1 ? 'es' : ''}</span>
                                </div>
                              </div>

                              {/* Habitaciones */}
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Habitaciones</Label>
                                {reservation.rooms.map((room, index) => (
                                  <div key={index} className="flex items-center gap-2 text-sm">
                                    <HomeIcon className="h-4 w-4" />
                                    <span>{room.roomNumber} - {room.roomType}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Montos */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <CurrencyDollarIcon className="h-4 w-4" />
                                  <span>Total: {formatCurrency(reservation.totalAmount || 0)}</span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Pagado: {formatCurrency(reservation.paidAmount || 0)}
                                </div>
                                {reservation.services.length > 0 && (
                                  <div className="text-sm">
                                    <Badge variant="outline">
                                      {reservation.services.length} servicio{reservation.services.length !== 1 ? 's' : ''}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {/* Paginación de reservas */}
                      {reservationsMeta.totalPages > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!reservationsMeta.hasPrevPage}
                            onClick={() => 
                              setReservationFilters(prev => ({ ...prev, page: reservationsMeta.page - 1 }))
                            }
                          >
                            Anterior
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Página {reservationsMeta.page} de {reservationsMeta.totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!reservationsMeta.hasNextPage}
                            onClick={() => 
                              setReservationFilters(prev => ({ ...prev, page: reservationsMeta.page + 1 }))
                            }
                          >
                            Siguiente
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground">
                        No se encontraron reservas para este huésped
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No se pudo cargar la información del huésped</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GuestHistory;