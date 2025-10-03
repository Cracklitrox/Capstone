import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/services/authContext.jsx';
import { getReservationHistory, getReservationDetailsById } from '@/services/reservation_history.js';

// Importa tus componentes de Shadcn/UI y Heroicons
import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.jsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { UserIcon, CalendarDaysIcon, HomeIcon, CurrencyDollarIcon, UsersIcon, SparklesIcon } from '@heroicons/react/24/outline';

const ReservationHistory = () => {
    const { token } = useAuth();
    const [history, setHistory] = useState([]);
    const [meta, setMeta] = useState({ page: 1, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [filters, setFilters] = useState({
        rut: '',
        roomId: '',
        startDate: '',
        endDate: '',
        page: 1,
    });

    const [selectedReservation, setSelectedReservation] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);

    // Un simple temporizador para evitar llamadas a la API en cada tecleo
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchHistory();
        }, 500); // Espera 500ms después de que el usuario deja de escribir

        return () => clearTimeout(timer); // Limpia el temporizador si el usuario sigue escribiendo
    }, [filters.rut, filters.roomId, filters.startDate, filters.endDate, filters.page, token]);

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

            const response = await getReservationHistory(activeFilters, token);
            setHistory(response.data);
            setMeta(response.meta);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [token, filters]);

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

    return (
        <main className="flex flex-1 flex-col p-4 sm:p-6 lg:p-8 space-y-6">
            <h1 className="text-3xl font-bold">Historial de Reservas</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Filtros de Búsqueda</CardTitle>
                    <CardDescription>Encuentra reservas completadas por diferentes criterios.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2"><Label htmlFor="rut">RUT Huésped</Label><Input id="rut" name="rut" placeholder="11111111-1" value={filters.rut} onChange={handleFilterChange} /></div>
                    <div className="space-y-2"><Label htmlFor="roomId">Nº Habitación</Label><Input id="roomId" name="roomId" placeholder="101" value={filters.roomId} onChange={handleFilterChange} /></div>
                    <div className="space-y-2"><Label htmlFor="startDate">Fecha Desde</Label><Input id="startDate" name="startDate" type="date" value={filters.startDate} onChange={handleFilterChange} /></div>
                    <div className="space-y-2"><Label htmlFor="endDate">Fecha Hasta</Label><Input id="endDate" name="endDate" type="date" value={filters.endDate} onChange={handleFilterChange} min={filters.startDate} /></div>
                </CardContent>
            </Card>

            {loading ? <p className="text-center text-muted-foreground py-10">Cargando historial...</p> : error && !isModalOpen ? <p className="text-center text-destructive py-10">{error}</p> : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>RUT</TableHead>
                                <TableHead>Nombre Cliente</TableHead>
                                <TableHead>Grupo</TableHead>
                                <TableHead>Habitación</TableHead>
                                <TableHead>Observación</TableHead>
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
                                    <TableCell className="max-w-[200px] truncate" title={item.observacion}>{item.observacion}</TableCell>
                                    <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => handleViewDetails(item.reservation_id)}>Ver más</Button></TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan="6" className="text-center h-24">No se encontraron resultados.</TableCell></TableRow>}
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

            {/* Ver más detalles de la reserva */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Detalles de la Reserva</DialogTitle>
                        <DialogDescription>{selectedReservation ? `Reserva #${selectedReservation.code}` : 'Cargando...'}</DialogDescription>
                    </DialogHeader>
                    {modalLoading ? <p className="text-center p-8 text-muted-foreground">Cargando detalles...</p> : error && isModalOpen ? <p className="text-center text-destructive p-8">{error}</p> : selectedReservation && (
                        <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1 pr-4">
                            <section><h3 className="text-lg font-semibold mb-2 flex items-center"><UserIcon className="h-5 w-5 mr-2" />Huésped Principal</h3><div className="grid grid-cols-2 gap-4 border p-4 rounded-md"><p><Label>Nombre:</Label> {`${selectedReservation.users_reservations_main_guest_idTousers.first_name} ${selectedReservation.users_reservations_main_guest_idTousers.paternal_last_name}`}</p><p><Label>Email:</Label> {selectedReservation.users_reservations_main_guest_idTousers.email}</p><p><Label>Teléfono:</Label> {selectedReservation.users_reservations_main_guest_idTousers.phone_number || 'N/A'}</p><p className="col-span-2"><Label>Observaciones:</Label> {selectedReservation.users_reservations_main_guest_idTousers.guest_details?.observations || 'Sin observaciones'}</p></div></section>
                            <section><h3 className="text-lg font-semibold mb-2 flex items-center"><CalendarDaysIcon className="h-5 w-5 mr-2" />Estadía</h3><div className="grid grid-cols-3 gap-4 border p-4 rounded-md"><p><Label>Check-In:</Label> {new Date(selectedReservation.check_in_date).toLocaleDateString()}</p><p><Label>Check-Out:</Label> {new Date(selectedReservation.check_out_date).toLocaleDateString()}</p><p><Label>Días Alojados:</Label> {selectedReservation.days_stayed}</p></div></section>
                            <section><h3 className="text-lg font-semibold mb-2 flex items-center"><UsersIcon className="h-5 w-5 mr-2" />Grupo ({selectedReservation.guest_count} pers.)</h3><ul className="list-disc list-inside border p-4 rounded-md">{selectedReservation.reservation_guests.map(guest => (<li key={guest.id}>{`${guest.users.first_name} ${guest.users.paternal_last_name}`}</li>))}</ul></section>
                            <section><h3 className="text-lg font-semibold mb-2 flex items-center"><HomeIcon className="h-5 w-5 mr-2" />Habitaciones</h3>{selectedReservation.reservation_rooms.map(rr => (<div key={rr.id} className="grid grid-cols-3 gap-4 border p-4 rounded-md mt-2"><p><Label>Número:</Label> {rr.rooms.room_number}</p><p><Label>Tipo:</Label> {rr.rooms.room_types.name}</p><p><Label>Piso:</Label> {rr.rooms.floor}</p></div>))}</section>
                            {selectedReservation.reservation_services.length > 0 && (<section><h3 className="text-lg font-semibold mb-2 flex items-center"><SparklesIcon className="h-5 w-5 mr-2" />Servicios Adicionales</h3><ul className="list-disc list-inside border p-4 rounded-md">{selectedReservation.reservation_services.map(rs => (<li key={rs.id}>{rs.services.name} (x{rs.quantity})</li>))}</ul></section>)}
                            <section><h3 className="text-lg font-semibold mb-2 flex items-center"><CurrencyDollarIcon className="h-5 w-5 mr-2" />Detalles Financieros</h3><div className="grid grid-cols-2 gap-4 border p-4 rounded-md"><p><Label>Monto Total:</Label> ${selectedReservation.total_amount?.toLocaleString('es-CL')}</p><p><Label>Monto Pagado:</Label> ${selectedReservation.paid_amount?.toLocaleString('es-CL')}</p></div></section>
                        </div>
                    )}
                    <DialogFooter className="pt-4"><Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cerrar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    );
};

export default ReservationHistory;