import React, { useState } from 'react';
import Navbar from '../../components/Navbar'; 
import Sidebar from '../../components/Sidebar'; 
import Footer from '../../components/Footer';


const RoomCard = ({ number, status }) => {
  const statusStyles = {
    disponible: 'border-green-500 text-green-700 bg-green-50',
    ocupado: 'border-red-500 text-red-700 bg-red-50',
    pendiente: 'border-yellow-500 text-yellow-700 bg-yellow-50',
    limpieza: 'border-purple-500 text-purple-700 bg-purple-50',
    mantenimiento: 'border-gray-800 text-gray-800 bg-gray-100',
    'no habitado': 'border-orange-500 text-orange-700 bg-orange-50',
  };

  return (
    <div
      className={`border-l-4 p-4 rounded-md shadow-sm text-center font-bold ${statusStyles[status] || 'border-gray-300'
        }`}
    >
      Hab. {number}
    </div>
  );
};


const ReceptionistHome = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar setSidebarOpen={setSidebarOpen} />

      <div className="flex flex-1">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="flex-1 p-4 sm:p-6 bg-gray-100 overflow-y-auto">
          <h1 className="text-3xl font-bold text-gray-800">Resumen Hoy</h1>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-lg shadow text-center">
              <h2 className="text-lg font-semibold text-gray-600">Ocupación</h2>
              <p className="text-3xl font-bold text-blue-600">72%</p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow text-center">
              <h2 className="text-lg font-semibold text-gray-600">Pendientes</h2>
              <p className="text-3xl font-bold text-yellow-600">4</p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow text-center">
              <h2 className="text-lg font-semibold text-gray-600">Check In</h2>
              <p className="text-3xl font-bold text-green-600">11</p>
            </div>
            <div className="p-4 bg-white rounded-lg shadow text-center">
              <h2 className="text-lg font-semibold text-gray-600">Check Out</h2>
              <p className="text-3xl font-bold text-red-600">9</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-green-200 text-green-800 p-4 rounded-lg shadow-md">
              <h2 className="text-xl font-bold">Habitación 101</h2>
              <p className="mt-1">Disponible ahora</p>
            </div>
            <div className="bg-yellow-200 text-yellow-800 p-4 rounded-lg shadow-md">
              <h2 className="text-xl font-bold">Habitación 102</h2>
              <p className="mt-1">Reservada: Carlos Pérez</p>
            </div>
            <div className="bg-red-200 text-red-800 p-4 rounded-lg shadow-md">
              <h2 className="text-xl font-bold">Habitación 301</h2>
              <p className="mt-1">Ocupada por J. Perez</p>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-700">Mapa de habitaciones - Tiempo real</h2>
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

          <div className="mt-8 p-4 bg-white rounded-lg shadow">
            <h3 className="text-xl font-bold text-gray-700 mb-3">Leyenda</h3>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center"><span className="h-4 w-4 mr-2 bg-green-500 rounded-full border border-gray-200"></span>Disponible</div>
              <div className="flex items-center"><span className="h-4 w-4 mr-2 bg-red-500 rounded-full border border-gray-200"></span>Ocupado</div>
              <div className="flex items-center"><span className="h-4 w-4 mr-2 bg-yellow-500 rounded-full border border-gray-200"></span>Pendiente</div>
              <div className="flex items-center"><span className="h-4 w-4 mr-2 bg-purple-500 rounded-full border border-gray-200"></span>Limpieza</div>
              <div className="flex items-center"><span className="h-4 w-4 mr-2 bg-gray-800 rounded-full border border-gray-200"></span>Mantenimiento</div>
              <div className="flex items-center"><span className="h-4 w-4 mr-2 bg-orange-500 rounded-full border border-gray-200"></span>No habitado</div>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default ReceptionistHome;