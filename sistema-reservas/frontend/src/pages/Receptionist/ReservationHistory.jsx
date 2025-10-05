import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/services/authContext.jsx';
import { getReservationHistory, getReservationDetailsById } from '@/services/reservation_history.js';
import { fetchRooms } from '@/services/rooms.js';
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CurrencyDollarIcon } from "@heroicons/react/24/outline";

// Importa tus componentes de Shadcn/UI y Heroicons
import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { Calendar } from "@/components/ui/Calendar";
import { PencilIcon, MagnifyingGlassIcon, XCircleIcon, CalendarIcon } from '@heroicons/react/24/outline';

const API_URL = 'http://localhost:3001/api/v1';

const ReservationHistory = () => {
    const { token } = useAuth();
    const [history, setHistory] = useState([]);
    const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allRooms, setAllRooms] = useState([]);

    // Estado unificado y moderno para los filtros
    const [filters, setFilters] = useState({
        rut: '',
        floor: '',
        roomId: '',
        startDate: null,
        endDate: null,
    });

    const [selectedReservation, setSelectedReservation] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [isEditingObservation, setIsEditingObservation] = useState(false);
    const [newObservation, setNewObservation] = useState('');

    // Carga las habitaciones para obtener los pisos dinámicamente
    useEffect(() => {
        if (token) {
            fetchRooms(token)
                .then(setAllRooms)
                .catch(err => console.error("Error al cargar habitaciones para filtros:", err));
        }
    }, [token]);

    const availableFloors = useMemo(() => {
        if (!allRooms.length) return [];
        return Array.from(new Set(allRooms.map(room => room.floor))).sort((a, b) => a - b);
    }, [allRooms]);

    // Función para obtener el historial, ahora conectada a los nuevos filtros
    const fetchHistory = useCallback(async (page = 1) => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const apiFilters = {
                page,
                rut: filters.rut || undefined,
                roomId: filters.roomId && !isNaN(filters.roomId) ? Number(filters.roomId) : undefined,
                floor: filters.floor || undefined,
                startDate: filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : undefined,
                endDate: filters.endDate ? format(filters.endDate, 'yyyy-MM-dd') : undefined,
            };
            const response = await getReservationHistory(apiFilters, token);
            setHistory(response.data || []);
            setMeta(response.meta || { page: 1, totalPages: 1 });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [token, filters]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchHistory(1);
        }, 500);
        return () => clearTimeout(handler);
    }, [filters, fetchHistory]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const resetFilters = () => {
        setFilters({ rut: '', floor: '', roomId: '', startDate: null, endDate: null });
    };

    const handleViewDetails = async (reservationId) => {
        setIsModalOpen(true);
        setModalLoading(true);
        try {
            const details = await getReservationDetailsById(reservationId, token);
            setSelectedReservation(details);
        } catch (err) { setError(err.message); }
        finally { setModalLoading(false); }
    };

    const calculateStayDays = (checkInDate, checkOutDate) => {
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        const difference = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        return difference > 0 ? difference : 1;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return format(parseISO(dateString), 'dd/MM/yyyy');
        } catch {
            return 'Fecha inválida';
        }
    };

    const handleEditObservation = async () => {
        if (isEditingObservation) {
            try {
                const observationToSave = newObservation.trim() === '' ? 'Sin observaciones' : newObservation;

                const response = await fetch(`${API_URL}/reservation_history/${selectedReservation.id}/observation`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ observation: observationToSave }),
                });

                if (!response.ok) {
                    throw new Error('Error al actualizar la observación');
                }

                const updatedReservation = await response.json();

                setSelectedReservation(prevReservation => ({
                    ...prevReservation,
                    users_reservations_main_guest_idTousers: {
                        ...prevReservation.users_reservations_main_guest_idTousers,
                        guest_details: {
                            ...prevReservation.users_reservations_main_guest_idTousers.guest_details,
                            observations: observationToSave,
                        },
                    },
                }));

                setHistory(prevHistory =>
                    prevHistory.map(item =>
                        item.reservation_id === updatedReservation.id
                            ? { ...item, observacion: observationToSave }
                            : item
                    )
                );

                setIsEditingObservation(false);
            } catch (err) {
                setError(err.message);
            }
        } else {
            setNewObservation(selectedReservation.users_reservations_main_guest_idTousers.guest_details?.observations || '');
            setIsEditingObservation(true);
        }
    };


    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= meta.totalPages) {
            fetchHistory(newPage);
        }
    };

    return (
        <main className="container mx-auto p-4 space-y-6">
            <h1 className="text-3xl font-bold">Historial de Reservas</h1>

            {/* --- PANEL DE FILTROS MODERNIZADO Y FUNCIONAL --- */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><MagnifyingGlassIcon className="h-6 w-6" />Filtros de Búsqueda</CardTitle>
                    <CardDescription>Encuentra reservas completadas por diferentes criterios.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="rut">RUT o Pasaporte</Label>
                            <Input id="rut" placeholder="Buscar..." value={filters.rut} onChange={(e) => handleFilterChange('rut', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="floor">Piso</Label>
                            <Select value={filters.floor} onValueChange={(value) => handleFilterChange('floor', value === 'all' ? '' : value)}>
                                <SelectTrigger id="floor"><SelectValue placeholder="Todos" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los pisos</SelectItem>
                                    {availableFloors.map(f => (<SelectItem key={f} value={String(f)}>Piso {f}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="roomId">N° Habitación</Label>
                            <Input id="roomId" placeholder="Ej: 101" value={filters.roomId} onChange={(e) => handleFilterChange('roomId', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Check-in desde</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {filters.startDate ? format(filters.startDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={filters.startDate} onSelect={(date) => handleFilterChange('startDate', date)} initialFocus locale={es} />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label>Check-out hasta</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {filters.endDate ? format(filters.endDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={filters.endDate} onSelect={(date) => handleFilterChange('endDate', date)} initialFocus locale={es} />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex items-end">
                            <Button onClick={resetFilters} variant="ghost" className="w-full"><XCircleIcon className="mr-2 h-5 w-5" />Limpiar</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <p className="text-center text-muted-foreground py-10">Cargando historial...</p>
            ) : error ? (
                <p className="text-center text-destructive py-10">{error}</p>
            ) : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>RUT</TableHead>
                                <TableHead>Nombre Cliente</TableHead>
                                <TableHead>Habitación</TableHead>
                                <TableHead>Fecha Ingreso</TableHead>
                                <TableHead>Fecha Salida</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.length > 0 ? history.map(item => (
                                <TableRow key={item.reservation_id}>
                                    <TableCell className="font-mono">{item.rut}</TableCell>
                                    <TableCell>{item.nombre_cliente}</TableCell>
                                    <TableCell>{item.habitacion_reservada}</TableCell>
                                    <TableCell>{formatDate(item.check_in_date)}</TableCell>
                                    <TableCell>{formatDate(item.check_out_date)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(item.reservation_id)}>Ver más</Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan="6" className="text-center h-24">No se encontraron resultados.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Card>
            )}

            {meta.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                    <Button variant="outline" size="sm" disabled={meta.page <= 1 || loading} onClick={() => handlePageChange(meta.page - 1)}>Anterior</Button>
                    <span className="text-sm font-semibold">Página {meta.page} de {meta.totalPages}</span>
                    <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages || loading} onClick={() => handlePageChange(meta.page + 1)}>Siguiente</Button>
                </div>
            )}

            {/* Modal de Ver más detalles */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Detalles de la Reserva</DialogTitle>
                        <DialogDescription>{selectedReservation ? `Reserva #${selectedReservation.code}` : 'Cargando...'}</DialogDescription>
                    </DialogHeader>
                    {modalLoading ? <p className="text-center p-8 text-muted-foreground">Cargando detalles...</p> : error && isModalOpen ? <p className="text-center text-destructive p-8">{error}</p> : selectedReservation && (
                        <Tabs defaultValue="tab1">
                            <TabsList>
                                <TabsTrigger value="tab1">Información Básica</TabsTrigger>
                                <TabsTrigger value="tab2">Detalles Adicionales</TabsTrigger>
                            </TabsList>

                            <TabsContent value="tab1">
                                <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1 pr-4">
                                    <section>
                                        <h3 className="text-lg font-semibold mb-2 flex items-center">Huésped Principal</h3>
                                        <p>{`${selectedReservation.users_reservations_main_guest_idTousers.first_name} ${selectedReservation.users_reservations_main_guest_idTousers.paternal_last_name}`}</p>
                                    </section>
                                    <section>
                                        <h3 className="text-lg font-semibold mb-2 flex items-center">Estadía</h3>
                                        <p><strong>Días de Estancia:</strong> {calculateStayDays(selectedReservation.check_in_date, selectedReservation.check_out_date)} días</p>
                                        <p>Check-In: {formatDate(selectedReservation.check_in_date)}</p>
                                        <p>Check-Out: {formatDate(selectedReservation.check_out_date)}</p>
                                    </section>
                                    <section>
                                        <h3 className="text-lg font-semibold mb-2 flex items-center">
                                            <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                                            Detalles Financieros
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4 border p-4 rounded-md">
                                            <p>
                                                <Label>Monto Total:</Label> ${' '}
                                                {selectedReservation.total_amount !== undefined
                                                    ? selectedReservation.total_amount.toLocaleString('es-CL')
                                                    : 'No disponible'}
                                            </p>
                                            <p>
                                                <Label>Monto Pagado:</Label> ${' '}
                                                {selectedReservation.paid_amount !== undefined
                                                    ? selectedReservation.paid_amount.toLocaleString('es-CL')
                                                    : 'No disponible'}
                                            </p>
                                        </div>
                                    </section>

                                </div>
                            </TabsContent>

                            <TabsContent value="tab2">
                                <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1 pr-4">
                                    <section>
                                        <h3 className="text-lg font-semibold mb-2 flex items-center">Habitaciones</h3>
                                        <ul>
                                            {selectedReservation.reservation_rooms.map(rr => (
                                                <li key={rr.id}>{rr.rooms.room_number} - {rr.rooms.room_types.name}</li>
                                            ))}
                                        </ul>
                                    </section>
                                    <section>
                                        <h3 className="text-lg font-semibold mb-2 flex items-center">Teléfono</h3>
                                        {selectedReservation.users_reservations_main_guest_idTousers.phone_number || 'No disponible'}
                                    </section>

                                    <section>
                                        <h3 className="text-lg font-semibold mb-2 flex items-center">Servicios</h3>
                                        <ul>
                                            {selectedReservation.reservation_services.map(rs => (
                                                <li key={rs.id}>{rs.services.name} (x{rs.quantity})</li>
                                            ))}
                                        </ul>
                                    </section>
                                    <section>
                                        <h3 className="text-lg font-semibold mb-2 flex items-center">Observación</h3>
                                        {isEditingObservation ? (
                                            // Si estamos en modo edición, mostramos un campo editable
                                            <textarea
                                                value={newObservation}
                                                onChange={(e) => setNewObservation(e.target.value)}
                                                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white"
                                            />
                                        ) : (
                                            // Si no estamos editando, mostramos la observación como texto o "Sin observaciones" si está vacía
                                            <p>{selectedReservation.users_reservations_main_guest_idTousers.guest_details?.observations || 'Sin observaciones'}</p>
                                        )}
                                        {/* Botón para activar/desactivar el modo edición */}
                                        <Button variant="outline" size="sm" onClick={handleEditObservation}>
                                            {isEditingObservation ? 'Guardar' : 'Editar'}
                                        </Button>
                                    </section>
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}
                    <DialogFooter className="pt-4">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    );
};

export default ReservationHistory;