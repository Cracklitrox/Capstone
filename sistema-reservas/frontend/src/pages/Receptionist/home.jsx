import React, { useState } from 'react';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import Footer from '../../components/Footer';
import RoomBoard from '../../components/RoomBoard';

const ReceptionistHome = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar setSidebarOpen={setSidebarOpen} />
      <div className="flex flex-1">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 p-4 sm:p-6 bg-gray-100 overflow-y-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Estado Habitaciones</h1>
          <RoomBoard onNewReservation={() => alert("Función de nueva reserva (placeholder)")} />
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default ReceptionistHome;