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
  XCircleIcon,
  PencilIcon,
  CheckIcon 
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
  const [activeTab, setActiveTab] = useState('active-reservation'); // Tab activo por defecto
  
  // Estados para modal de huésped adicional
  const [isAdditionalGuestModalOpen, setIsAdditionalGuestModalOpen] = useState(false);
  const [selectedAdditionalGuest, setSelectedAdditionalGuest] = useState(null);

  // Función para calcular edad
  const calculateAge = (birthDate) => {
    if (!birthDate) return 'Sin datos';
    
    try {
      const birth = parseISO(birthDate);
      const now = new Date();
      
      const years = differenceInYears(now, birth);
      const months = differenceInMonths(now, birth) % 12;
      const days = differenceInDays(now, new Date(now.getFullYear(), now.getMonth() - months, birth.getDate())) % 30;
      
      return `${years} años, ${months} meses, ${days} días`;
    } catch (error) {
      return 'Sin datos';
    }
  };

  // Función para formatear datos vacíos
  const formatData = (value, defaultText = 'Sin datos') => {
    if (!value || value === '' || value === null || value === undefined) {
      return defaultText;
    }
    return value;
  };
  
  // Estados para filtros de reservas
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });
  const [reservationsMeta, setReservationsMeta] = useState({ page: 1, totalPages: 1 });
  
  // Estados para editar observaciones
  const [isEditingObservations, setIsEditingObservations] = useState(false);
  const [editedObservations, setEditedObservations] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [savingObservations, setSavingObservations] = useState(false);
  
  // Estados para reservas
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservationFilters, setReservationFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
    page: 1
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
        setGuestProfile(response.profile);
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
    // Inicializar texto de observaciones
    setEditedObservations('');
    setIsEditingObservations(false);
  };

  // Iniciar edición de observaciones
  const handleEditObservations = () => {
    setEditedObservations(guestProfile?.observations || '');
    setIsEditingObservations(true);
  };

  // Cancelar edición de observaciones
  const handleCancelEditObservations = () => {
    setIsEditingObservations(false);
    setEditedObservations('');
  };

  // Guardar observaciones
  const handleSaveObservations = async () => {
    if (!selectedGuest) return;
    
    setSavingObservations(true);
    try {
      await guestHistoryService.updateGuestObservations(selectedGuest.id, editedObservations);
      
      // Actualizar el perfil local
      setGuestProfile(prev => ({
        ...prev,
        observations: editedObservations
      }));
      
      setIsEditingObservations(false);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingObservations(false);
    }
  };

  // Formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(amount);
  };

  // Manejar selección de huésped adicional
  const handleSelectAdditionalGuest = async (additionalGuest) => {
    try {
      // Si ya tenemos datos completos del huésped (de la reserva activa), usarlos
      if (additionalGuest.email && additionalGuest.email !== 'Sin datos') {
        setSelectedAdditionalGuest(additionalGuest);
        setIsAdditionalGuestModalOpen(true);
        return;
      }

      // Si no tenemos datos completos, obtenerlos del backend
      const response = await guestHistoryService.getGuestProfile(additionalGuest.id);
      if (response.found) {
        setSelectedAdditionalGuest(response.profile);
        setIsAdditionalGuestModalOpen(true);
      } else {
        // Si no se encuentran datos, usar los datos básicos disponibles
        setSelectedAdditionalGuest(additionalGuest);
        setIsAdditionalGuestModalOpen(true);
      }
    } catch (error) {
      console.error('Error al obtener datos del huésped:', error);
      // En caso de error, usar los datos básicos disponibles
      setSelectedAdditionalGuest(additionalGuest);
      setIsAdditionalGuestModalOpen(true);
    }
  };

  // Cerrar modal de huésped adicional
  const handleCloseAdditionalGuestModal = () => {
    setIsAdditionalGuestModalOpen(false);
    setSelectedAdditionalGuest(null);
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
      'in_progress': 'default',
      'pending': 'outline',
      'canceled': 'destructive',
      'no_show': 'destructive',
    };
    return variants[status] || 'outline';
  };

  // Traducciones de estado
  const statusTranslations = {
    'completed': 'Completada',
    'confirmed': 'Confirmada',
    'in_progress': 'En Progreso',
    'pending': 'Pendiente',
    'canceled': 'Cancelada',
    'no_show': 'No se Presentó',
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
            <Tabs defaultValue="active-reservation" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="active-reservation">Reserva Activa</TabsTrigger>
                <TabsTrigger value="profile">Datos del Huésped</TabsTrigger>
                <TabsTrigger value="reservations">Historial de Reservas</TabsTrigger>
              </TabsList>

              {/* Tab 1: Reserva Activa */}
              <TabsContent value="active-reservation" className="space-y-4">
                {guestProfile?.activeReservation ? (
                  <div className="space-y-4">
                    {/* Información de la reserva activa */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CalendarIcon className="h-5 w-5" />
                          Reserva Activa - {guestProfile.activeReservation.code}
                        </CardTitle>
                        <CardDescription>
                          Estado: <Badge variant={guestProfile.activeReservation.status === 'confirmed' ? 'default' : 'secondary'}>
                            {guestProfile.activeReservation.status === 'confirmed' ? 'Confirmada' : 
                             guestProfile.activeReservation.status === 'in_progress' ? 'En progreso' : 
                             guestProfile.activeReservation.status}
                          </Badge>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Fechas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">Check-in</Label>
                            <p className="font-medium">
                              {format(parseISO(guestProfile.activeReservation.checkInDate), 'PPP', { locale: es })}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Check-out</Label>
                            <p className="font-medium">
                              {format(parseISO(guestProfile.activeReservation.checkOutDate), 'PPP', { locale: es })}
                            </p>
                          </div>
                        </div>

                        {/* Información financiera */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-primary">
                              ${(guestProfile.activeReservation.totalAmount || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">Total Reserva</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">
                              ${(guestProfile.activeReservation.paidAmount || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">Saldo Abonado</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-orange-600">
                              ${(guestProfile.activeReservation.pendingAmount || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">Saldo Pendiente</p>
                          </div>
                        </div>

                        {/* Huéspedes */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Huéspedes en esta reserva ({guestProfile.activeReservation.guestCount})</Label>
                          <div className="space-y-2">
                            {/* Huésped principal */}
                            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div>
                                <p className="font-medium">{guestProfile.activeReservation.mainGuest.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {guestProfile.activeReservation.mainGuest.isMainGuest ? 'Huésped Principal (quien reservó)' : 'Huésped Principal'}
                                </p>
                              </div>
                              <Badge variant="outline">Principal</Badge>
                            </div>
                            
                            {/* Huéspedes adicionales */}
                            {guestProfile.activeReservation.additionalGuests.map((guest, index) => (
                              <div key={guest.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex-1">
                                  <p className="font-medium">{guest.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatData(guest.email)} • {formatData(guest.phone)}
                                  </p>
                                  {guest.isCurrentGuest && (
                                    <Badge variant="secondary" className="mt-1">Huésped Actual</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">Adicional</Badge>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSelectAdditionalGuest(guest)}
                                    className="h-8"
                                  >
                                    <EyeIcon className="h-4 w-4 mr-1" />
                                    Ver Detalles
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Habitaciones */}
                        {guestProfile.activeReservation.rooms.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Habitaciones ({guestProfile.activeReservation.rooms.length})</Label>
                            <div className="space-y-2">
                              {guestProfile.activeReservation.rooms.map((room, index) => (
                                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div>
                                    <p className="font-medium">Habitación {room.roomNumber}</p>
                                    <p className="text-sm text-muted-foreground">{room.roomType}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">${room.subtotal.toLocaleString()}</p>
                                    <p className="text-sm text-muted-foreground">${room.unitPrice.toLocaleString()}/noche</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Servicios */}
                        {guestProfile.activeReservation.services.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Servicios ({guestProfile.activeReservation.services.length})</Label>
                            <div className="space-y-2">
                              {guestProfile.activeReservation.services.map((service, index) => (
                                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div>
                                    <p className="font-medium">{service.name}</p>
                                    <p className="text-sm text-muted-foreground">Cantidad: {service.quantity}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">${service.subtotal.toLocaleString()}</p>
                                    <p className="text-sm text-muted-foreground">${service.unitPrice.toLocaleString()} c/u</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Pagos realizados */}
                        {guestProfile.activeReservation.payments.length > 0 && (
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Pagos Realizados</Label>
                            <div className="space-y-2">
                              {guestProfile.activeReservation.payments.map((payment, index) => (
                                <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div>
                                    <p className="font-medium">${payment.amount.toLocaleString()}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {payment.method} • {format(parseISO(payment.createdAt), 'PPp', { locale: es })}
                                      {payment.isDeposit && ' • Depósito'}
                                    </p>
                                  </div>
                                  <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                                    {payment.status === 'completed' ? 'Completado' : payment.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Sin reserva activa</h3>
                      <p className="text-muted-foreground">
                        Este huésped no tiene ninguna reserva activa o pendiente en este momento.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tab 2: Información Personal */}
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
                        <p className="font-mono">{formatData(guestProfile.identificationNumber)}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Email</Label>
                        <p>{formatData(guestProfile.email)}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Teléfono</Label>
                        <p>{formatData(guestProfile.phone)}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Género</Label>
                        <p>{formatData(guestProfile.gender === 'male' ? 'Masculino' : guestProfile.gender === 'female' ? 'Femenino' : guestProfile.gender === 'other' ? 'Otro' : guestProfile.gender)}</p>
                      </div>
                      {guestProfile.birthDate && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Edad</Label>
                          <p className="font-medium text-primary">
                            {calculateAge(guestProfile.birthDate)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Nacido el {formatDate(guestProfile.birthDate)}
                          </p>
                        </div>
                      )}
                      <div>
                        <Label className="text-xs text-muted-foreground">Fecha de registro</Label>
                        <p>{formatData(guestProfile.registrationDate ? formatDate(guestProfile.registrationDate) : null)}</p>
                      </div>
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
                        <p>{formatData(guestProfile.nationality)}</p>
                      </div>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground">Viaja con niños</Label>
                        <p>{guestProfile.travelsWithChildren ? 'Sí' : 'No'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Solicitudes especiales</Label>
                        <p className="text-sm">{formatData(guestProfile.specialRequests)}</p>
                      </div>
                      {/* Observaciones editables */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs text-muted-foreground">Observaciones</Label>
                          {!isEditingObservations ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleEditObservations}
                              className="h-6 w-6 p-0"
                            >
                              <PencilIcon className="h-3 w-3" />
                            </Button>
                          ) : (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSaveObservations}
                                className="h-6 w-6 p-0 text-green-600"
                              >
                                <CheckIcon className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelEditObservations}
                                className="h-6 w-6 p-0 text-red-600"
                              >
                                <XCircleIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {isEditingObservations ? (
                          <textarea
                            value={editedObservations}
                            onChange={(e) => setEditedObservations(e.target.value)}
                            placeholder="Ingrese observaciones sobre el huésped..."
                            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        ) : (
                          <p className="text-sm min-h-[40px]">
                            {formatData(guestProfile.observations, "Sin observaciones")}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Estadísticas Financieras y de Reservas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Estadísticas Generales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                        <p className="text-2xl font-bold text-red-600">
                          {guestProfile.stats.canceledReservations || 0}
                        </p>
                        <p className="text-sm text-muted-foreground">Canceladas</p>
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="space-y-2 mb-4">
                      <h4 className="font-medium text-sm">Información Financiera Total</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">
                          ${(guestProfile.stats.totalReservationAmount || 0).toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">Saldo Total de Reservas</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">
                          ${(guestProfile.stats.totalPaidAmount || 0).toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">Saldo Total Abonado</p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-2xl font-bold text-orange-600">
                          ${(guestProfile.stats.totalPendingAmount || 0).toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">Saldo Total Pendiente</p>
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
                      <Label className="text-xs text-muted-foreground">Estado</Label>
                      <Badge variant={guestProfile.status === 'active' ? 'default' : 'secondary'}>
                        {guestProfile.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 3: Historial de Reservas */}
              <TabsContent value="reservations" className="space-y-4">
                {/* Filtros para reservas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Filtros</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                          onClick={() => setReservationFilters({ startDate: '', endDate: '', page: 1 })}
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
                    <CardContent className="space-y-6">
                      {guestReservations.map((reservation) => (
                        <Card key={reservation.id} className="border-l-4 border-l-primary">
                          <CardContent className="pt-4 space-y-4">
                            {/* Encabezado de la reserva */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <Badge variant={getStatusVariant(reservation.status)}>
                                  {statusTranslations[reservation.status] || reservation.status}
                                </Badge>
                                <span className="font-mono text-sm font-medium">{reservation.code}</span>
                                {reservation.currentGuestRole && (
                                  <Badge variant={reservation.currentGuestRole === 'principal' ? 'default' : 'secondary'}>
                                    {reservation.currentGuestRole === 'principal' ? 'Huésped Principal' : 'Huésped Adicional'}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-right text-sm text-muted-foreground">
                                {formatDate(reservation.checkInDate)} - {formatDate(reservation.checkOutDate)}
                              </div>
                            </div>

                            {/* Información financiera destacada */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                              <div className="text-center">
                                <p className="text-xl font-bold text-primary">
                                  ${(reservation.totalAmount || 0).toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">Total Reserva</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xl font-bold text-green-600">
                                  ${(reservation.paidAmount || 0).toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">Saldo Abonado</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xl font-bold text-orange-600">
                                  ${(reservation.pendingAmount || 0).toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">Saldo Pendiente</p>
                              </div>
                            </div>

                            {/* Detalles en grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Huéspedes */}
                              <div className="space-y-3">
                                <Label className="text-sm font-medium">Huéspedes ({reservation.guestCount})</Label>
                                <div className="space-y-2">
                                  {reservation.allGuests?.map((guest, index) => (
                                    <div key={guest.id} className={`flex items-center justify-between p-2 rounded border ${guest.isCurrentGuest ? 'bg-blue-50 border-blue-200' : ''}`}>
                                      <div className="flex-1">
                                        <p className="font-medium text-sm">{guest.name}</p>
                                        <p className="text-xs text-muted-foreground">{guest.identificationNumber}</p>
                                        {guest.isCurrentGuest && (
                                          <Badge variant="secondary" className="mt-1">Huésped Actual</Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant={guest.role === 'principal' ? 'default' : 'outline'}>
                                          {guest.role === 'principal' ? 'Principal' : 'Adicional'}
                                        </Badge>
                                        {guest.role === 'adicional' && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleSelectAdditionalGuest({
                                              id: guest.id,
                                              name: guest.name,
                                              identificationNumber: guest.identificationNumber,
                                              firstName: guest.name.split(' ')[0],
                                              paternalLastName: guest.name.split(' ')[1] || '',
                                              maternalLastName: guest.name.split(' ')[2] || '',
                                              email: 'Sin datos',
                                              phone: 'Sin datos',
                                              gender: 'Sin datos',
                                              nationality: 'Sin datos',
                                              birthDate: null,
                                              registrationDate: null
                                            })}
                                            className="h-6 text-xs"
                                          >
                                            <EyeIcon className="h-3 w-3 mr-1" />
                                            Ver
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  )) || (
                                    <div className="p-2 border rounded">
                                      <p className="text-sm">{reservation.mainGuest?.name}</p>
                                      <Badge variant="default">Principal</Badge>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Habitaciones */}
                              <div className="space-y-3">
                                <Label className="text-sm font-medium">Habitaciones ({reservation.rooms?.length || 0})</Label>
                                <div className="space-y-2">
                                  {reservation.rooms?.map((room, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                                      <div>
                                        <p className="font-medium text-sm">{room.roomNumber}</p>
                                        <p className="text-xs text-muted-foreground">{room.roomType}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-medium text-sm">${room.subtotal?.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground">${room.unitPrice?.toLocaleString()}/noche</p>
                                      </div>
                                    </div>
                                  )) || (
                                    <p className="text-sm text-muted-foreground">Sin habitaciones registradas</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Servicios detallados */}
                            {reservation.services && reservation.services.length > 0 && (
                              <div className="space-y-3">
                                <Label className="text-sm font-medium">Servicios ({reservation.services.length})</Label>
                                <div className="space-y-2">
                                  {reservation.services.map((service, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                                      <div className="flex-1">
                                        <p className="font-medium text-sm">{service.name}</p>
                                        <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                                          <span>Cantidad: {service.quantity}</span>
                                          <span>Precio unitario: ${service.unitPrice?.toLocaleString()}</span>
                                          {service.dailyRate && <span>Tarifa diaria: ${service.dailyRate.toLocaleString()}</span>}
                                          {service.specificDates && <span>Fechas: {service.specificDates}</span>}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-bold text-sm">${service.subtotal?.toLocaleString()}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Pagos realizados */}
                            {reservation.payments && reservation.payments.length > 0 && (
                              <div className="space-y-3">
                                <Label className="text-sm font-medium">Historial de Pagos</Label>
                                <div className="space-y-2">
                                  {reservation.payments.map((payment, index) => (
                                    <div key={payment.id || index} className="flex items-center justify-between p-2 border rounded">
                                      <div>
                                        <p className="font-medium text-sm">${payment.amount?.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {payment.method} • {payment.createdAt ? format(parseISO(payment.createdAt), 'PPp', { locale: es }) : 'Fecha no disponible'}
                                          {payment.isDeposit && ' • Depósito'}
                                          {payment.sequence && ` • Pago #${payment.sequence}`}
                                        </p>
                                        {payment.transactionId && (
                                          <p className="text-xs text-muted-foreground">ID: {payment.transactionId}</p>
                                        )}
                                        {payment.notes && (
                                          <p className="text-xs text-muted-foreground">Notas: {payment.notes}</p>
                                        )}
                                      </div>
                                      <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                                        {payment.status === 'completed' ? 'Completado' : payment.status}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
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

      {/* Modal para Huésped Adicional */}
      <Dialog open={isAdditionalGuestModalOpen} onOpenChange={setIsAdditionalGuestModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Detalles del Huésped
            </DialogTitle>
            <DialogDescription>
              Información detallada del huésped adicional
            </DialogDescription>
          </DialogHeader>
          
          {selectedAdditionalGuest && (
            <div className="space-y-6">
              {/* Información Personal */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Datos Personales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Nombre Completo</Label>
                    <p className="font-medium">
                      {selectedAdditionalGuest.firstName} {selectedAdditionalGuest.paternalLastName} {selectedAdditionalGuest.maternalLastName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">RUT/Pasaporte</Label>
                    <p className="font-mono">{formatData(selectedAdditionalGuest.identificationNumber)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p>{formatData(selectedAdditionalGuest.email)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Teléfono</Label>
                    <p>{formatData(selectedAdditionalGuest.phone)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Género</Label>
                    <p>{formatData(selectedAdditionalGuest.gender === 'male' ? 'Masculino' : selectedAdditionalGuest.gender === 'female' ? 'Femenino' : selectedAdditionalGuest.gender === 'other' ? 'Otro' : selectedAdditionalGuest.gender)}</p>
                  </div>
                  {selectedAdditionalGuest.birthDate && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Edad</Label>
                      <p className="font-medium text-primary">
                        {calculateAge(selectedAdditionalGuest.birthDate)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Nacido el {formatDate(selectedAdditionalGuest.birthDate)}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-muted-foreground">Fecha de registro</Label>
                    <p>{formatData(selectedAdditionalGuest.registrationDate ? formatDate(selectedAdditionalGuest.registrationDate) : null)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">País</Label>
                    <p>{formatData(selectedAdditionalGuest.nationality)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Botón cerrar */}
              <div className="flex justify-end pt-4">
                <Button onClick={handleCloseAdditionalGuestModal} variant="outline">
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GuestHistory;