import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/services/authContext.jsx';
import { getReservationHistory, getReservationDetailsById } from '@/services/reservation_history.js';

// Importa tus componentes de Shadcn/UI y Heroicons
import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog.jsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";  // Importamos Tabs
import { PencilIcon } from '@heroicons/react/24/outline';  // Icono para el botón de edición

// Definir la URL de la API
const API_URL = 'http://localhost:3001/api/v1'; // Asegúrate de que esta URL sea correcta

const ReservationHistory = () => {
    const { token } = useAuth();
    const [history, setHistory] = useState([]);
    const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [floors, setFloors] = useState([]);  // Estado para los pisos disponibles
    const [filters, setFilters] = useState({
        rut: '',
        roomId: '',
        startDate: '',
        endDate: '',
        page: 1,
        roomFloor: '',  // Agregado para filtrar por piso
    });
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [isEditingObservation, setIsEditingObservation] = useState(false);  // Estado para saber si estamos editando
    const [newObservation, setNewObservation] = useState('');  // Almacenará el valor de la observación editada

    const resetFilters = () => {
        setFilters({
            rut: '',
            roomId: '',
            startDate: '',
            endDate: '',
            page: 1,
            roomFloor: '',
        });
    };

    // Función para obtener el historial de reservas
    const fetchHistory = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const activeFilters = { page: filters.page };
            if (filters.rut) activeFilters.rut = filters.rut;
            if (filters.roomId) activeFilters.roomId = filters.roomId;
            if (filters.startDate) activeFilters.startDate = filters.startDate;
            if (filters.endDate) activeFilters.endDate = filters.endDate;
            if (filters.roomFloor) activeFilters.roomFloor = filters.roomFloor;  // Agregado para el filtro de piso

            const response = await getReservationHistory(activeFilters, token);
            setHistory(response.data);
            setMeta(response.meta);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [token, filters]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    useEffect(() => {
        // Simulamos la carga de los pisos disponibles
        setFloors([{ id: 1, number: 1 }, { id: 2, number: 2 }, { id: 3, number: 3 }]);  // Cambiar según tus datos reales
    }, []);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
    };

    const handleViewDetails = async (reservationId) => {
        setIsModalOpen(true);
        setModalLoading(true);
        setSelectedReservation(null);
        setError(null);
        try {
            const details = await getReservationDetailsById(reservationId, token);
            setSelectedReservation(details);
        } catch (err) {
            setError(err.message);
        } finally {
            setModalLoading(false);
        }
    };

    const calculateStayDays = (checkInDate, checkOutDate) => {
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        const difference = Math.floor((checkOut - checkIn) / (1000 * 60 * 60 * 24)); // Días de diferencia
        return difference;
    };

    const formatDate = (date) => {
        const d = new Date(date);
        if (isNaN(d.getTime())) return 'Fecha inválida'; // Validación para fechas inválidas
        return d.toLocaleDateString(); // Formato en 'dd/mm/yyyy'
    };

    // Filtro por piso
    const handleFloorChange = (e) => {
        setFilters(prev => ({ ...prev, roomFloor: e.target.value }));
    };

    const handleEditObservation = async () => {
        if (isEditingObservation) {
            try {
                // If the observation is empty, default it to 'Sin observaciones'
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

                // Directly update the reservation's observation in the current modal state
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

                // Update history state with the new observation value
                setHistory(prevHistory =>
                    prevHistory.map(item =>
                        item.reservation_id === updatedReservation.id
                            ? { ...item, observacion: observationToSave }
                            : item
                    )
                );

                // Finish editing mode
                setIsEditingObservation(false);
            } catch (err) {
                setError(err.message); // Capture any errors
            }
        } else {
            // Start editing: load the current observation into the input field
            setNewObservation(selectedReservation.users_reservations_main_guest_idTousers.guest_details?.observations || '');
            setIsEditingObservation(true);
        }
    };




    return (
        <main className="flex flex-1 flex-col p-4 sm:p-6 lg:p-8 space-y-6">
            <h1 className="text-3xl font-bold">Historial de Reservas</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Filtros de Búsqueda</CardTitle>
                    <CardDescription>Encuentra reservas completadas por diferentes criterios.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="rut">RUT Huésped</Label>
                        <Input
                            id="rut"
                            name="rut"
                            placeholder="11111111-1"
                            value={filters.rut}
                            onChange={handleFilterChange}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="roomId">Nº Habitación</Label>
                        <Input
                            id="roomId"
                            name="roomId"
                            placeholder="101"
                            value={filters.roomId}
                            onChange={handleFilterChange}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="startDate">Fecha Desde</Label>
                        <Input
                            id="startDate"
                            name="startDate"
                            type="date"
                            value={filters.startDate}
                            onChange={handleFilterChange}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="endDate">Fecha Hasta</Label>
                        <Input
                            id="endDate"
                            name="endDate"
                            type="date"
                            value={filters.endDate}
                            onChange={handleFilterChange}
                            min={filters.startDate}
                        />
                    </div>
                    {/* Filtro por Piso */}
                    <div className="space-y-2">
                        <Label htmlFor="roomFloor">Piso</Label>
                        <select
                            id="roomFloor"
                            name="roomFloor"
                            value={filters.roomFloor}
                            onChange={handleFloorChange}
                            className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-800 text-white appearance-none"
                        >
                            <option value="" className="text-gray-400">Seleccione un Piso</option>
                            {floors.map(floor => (
                                <option key={floor.id} value={floor.number} className="text-gray-900">{`Piso ${floor.number}`}</option>
                            ))}
                        </select>
                    </div>

                </CardContent>
                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={resetFilters}>Limpiar campos</Button>
                </div>
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
                                <TableHead>Cantidad</TableHead>
                                <TableHead>Habitación</TableHead>
                                <TableHead>Fecha Ingreso</TableHead>
                                <TableHead>Fecha Salida</TableHead>
                                <TableHead>Estado</TableHead> {/* Columna para `is_active` */}
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.length > 0 ? history.map(item => (
                                <TableRow key={item.reservation_id}>
                                    <TableCell className="font-mono">{item.rut}</TableCell>
                                    <TableCell>{item.nombre_cliente}</TableCell>
                                    <TableCell>{item.grupo_asignado} pers.</TableCell>
                                    <TableCell>{item.habitacion_reservada}</TableCell>
                                    <TableCell>{formatDate(item.check_in_date)}</TableCell>
                                    <TableCell>{formatDate(item.check_out_date)}</TableCell>
                                    <TableCell>{item.is_active ? 'Activo' : 'Inactivo'}</TableCell> {/* Mostrar estado */}
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(item.reservation_id)}>Ver más</Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan="8" className="text-center h-24">No se encontraron resultados.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Card>
            )}

            {meta.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2">
                    <Button variant="outline" size="sm" disabled={meta.page === 1} onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}>Anterior</Button>
                    <span className="text-sm font-semibold">Página {meta.page} de {meta.totalPages}</span>
                    <Button variant="outline" size="sm" disabled={meta.page === meta.totalPages} onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}>Siguiente</Button>
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
                                        <p><strong>Teléfono:</strong> {selectedReservation.users_reservations_main_guest_idTousers.phone_number || 'No disponible'}</p>
                                    </section>
                                    <section>
                                        <h3 className="text-lg font-semibold mb-2 flex items-center">Estadía</h3>
                                        <p>Check-In: {formatDate(selectedReservation.check_in_date)}</p>
                                        <p>Check-Out: {formatDate(selectedReservation.check_out_date)}</p>
                                        <p><strong>Días de Estancia:</strong> {calculateStayDays(selectedReservation.check_in_date, selectedReservation.check_out_date)} días</p>
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
                                        <h3 className="text-lg font-semibold mb-2 flex items-center">Servicios</h3>
                                        <ul>
                                            {selectedReservation.reservation_services.map(rs => (
                                                <li key={rs.id}>{rs.services.name} (x{rs.quantity})</li>
                                            ))}
                                        </ul>
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
