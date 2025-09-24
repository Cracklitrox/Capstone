import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card.jsx";

// --- Componente RoomCard Refactorizado ---
const RoomCard = ({ number, status }) => {
  const statusStyles = {
    disponible: 'border-green-500 text-green-700 bg-green-100 dark:bg-green-900/50 dark:text-green-400',
    ocupado: 'border-red-500 text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-400',
    pendiente: 'border-yellow-500 text-yellow-700 bg-yellow-100 dark:bg-yellow-900/50 dark:text-yellow-400',
    limpieza: 'border-purple-500 text-purple-700 bg-purple-100 dark:bg-purple-900/50 dark:text-purple-400',
    mantenimiento: 'border-gray-600 text-gray-700 bg-gray-200 dark:bg-gray-800 dark:text-gray-400',
    'no habitado': 'border-orange-500 text-orange-700 bg-orange-100 dark:bg-orange-900/50 dark:text-orange-400',
  };
  return (
    <div className={`border-l-4 p-4 rounded-lg shadow-sm text-center font-bold ${statusStyles[status]}`}>
      Hab. {number}
    </div>
  );
};

// --- Componente de Leyenda Refactorizado ---
const LegendItem = ({ colorClass, label }) => (
  <div className="flex items-center">
    <span className={`h-4 w-4 mr-2 rounded-full border ${colorClass}`}></span>{label}
  </div>
);

const ReceptionistDashboard = () => {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-foreground">Resumen Hoy (Recepcionista)</h1>

      {/* Tarjetas de Resumen Refactorizadas con colores del tema */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-muted-foreground">Ocupación</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">72%</p>
          </CardContent>
        </Card>
        <Card>
           <CardHeader>
            <CardTitle className="text-lg font-semibold text-muted-foreground">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">4</p>
          </CardContent>
        </Card>
        <Card>
           <CardHeader>
            <CardTitle className="text-lg font-semibold text-muted-foreground">Check In</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">11</p>
          </CardContent>
        </Card>
        <Card>
           <CardHeader>
            <CardTitle className="text-lg font-semibold text-muted-foreground">Check Out</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">9</p>
          </CardContent>
        </Card>
      </div>

      {/* Mapa de Habitaciones */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Mapa de habitaciones - Tiempo real</h2>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          <RoomCard number="01" status="disponible" />
          <RoomCard number="02" status="ocupado" />
          <RoomCard number="03" status="mantenimiento" />
          <RoomCard number="04" status="limpieza" />
          <RoomCard number="05" status="pendiente" />
          <RoomCard number="06" status="ocupado" />
          <RoomCard number="07" status="disponible" />
          <RoomCard number="09" status="no habitado" />
        </div>
      </div>
      
      {/* Leyenda Refactorizada con colores del tema */}
      <Card>
        <CardHeader>
            <CardTitle className="text-xl font-bold">Leyenda</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <LegendItem colorClass="bg-green-500" label="Disponible" />
                <LegendItem colorClass="bg-red-500" label="Ocupado" />
                <LegendItem colorClass="bg-yellow-500" label="Pendiente" />
                <LegendItem colorClass="bg-purple-500" label="Limpieza" />
                <LegendItem colorClass="bg-gray-600" label="Mantenimiento" />
                <LegendItem colorClass="bg-orange-500" label="No habitado" />
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReceptionistDashboard;