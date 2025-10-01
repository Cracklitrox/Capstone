import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { Toaster } from 'sonner';

const Layout = () => {
  // El estado 'sidebarOpen' sigue viviendo aquí, como el "cerebro" del layout.
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Creamos una función 'toggle' para que sea más fácil de entender.
  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Toaster richColors position="top-right" />
      
      {/* El Sidebar ahora recibe el estado y la función para cerrarse. */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex flex-1 flex-col overflow-hidden">
        
        {/* El Navbar ahora recibe la función para "alternar" el estado del Sidebar. */}
        <Navbar toggleSidebar={toggleSidebar} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* El contenido de la página se mostrará aquí */}
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* El Footer fue removido para un diseño más limpio tipo "dashboard", 
            pero puedes agregarlo de nuevo aquí si lo deseas. */}
      </div>
    </div>
  );
};

export default Layout;