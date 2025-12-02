import React, { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';
import { useAuth } from '@/hooks/useAuth';
import { useAlertTime } from '@/hooks/useCheckoutNotifications';
import { Toaster } from 'sonner';

const Layout = () => {
  // Inicializar el estado del sidebar desde localStorage o por defecto según el tamaño de pantalla
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    // Por defecto: abierto en desktop (>= 1024px), cerrado en mobile
    return window.innerWidth >= 1024;
  });

  // Estado para controlar si el footer debe mostrarse
  const [showFooter, setShowFooter] = useState(false);
  const mainRef = useRef(null);

  useAuth();
  const { markAsRead } = useAlertTime(9);

  // Guardar el estado en localStorage cada vez que cambie
  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  // Detectar cuando el usuario llega al final de la página
  useEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = mainElement;
      // Mostrar footer cuando el usuario está a 100px del final
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
      setShowFooter(isNearBottom);
    };

    mainElement.addEventListener('scroll', handleScroll);
    // Verificar inmediatamente en caso de que no haya scroll
    handleScroll();

    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, []);

  // Creamos una función 'toggle' para que sea más fácil de entender.
  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Toaster richColors position="top-right" />

      {/* El Sidebar ahora recibe el estado y la función para cerrarse. */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className={`flex flex-1 flex-col overflow-hidden transition-[margin-left] duration-300 ease-in-out ${sidebarOpen ? 'ml-64' : 'ml-20'} max-lg:ml-0`}>

        {/* El Navbar ahora recibe la función para "alternar" el estado del Sidebar. */}
        <Navbar toggleSidebar={toggleSidebar} markAsRead={markAsRead} />

        <main ref={mainRef} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:px-6 lg:py-6">
          {/* El contenido de la página se mostrará aquí */}
          <div className="w-full mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Footer simple y elegante - solo visible cuando el usuario llega al final */}
        {showFooter && (
          <footer className="bg-card border-t border-border py-3 px-6 flex-shrink-0 transition-opacity duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
              <p>© 2025 Hotel Don Teo - Sistema de Reservas v1.0.0</p>
              <div className="flex gap-4">
                <a href="/profile" className="hover:text-primary transition-colors">Configuración</a>
                <a href="/admin-reports" className="hover:text-primary transition-colors">Reportes</a>
              </div>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
};

export default Layout;