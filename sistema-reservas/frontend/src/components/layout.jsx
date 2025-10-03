import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import CheckoutAlertModal from './CheckoutAlertModal';
import { useAuth } from '../services/authContext';
import { fetchCheckoutAlerts } from '../services/notifications';
import { useCheckoutNotifications, useAlertTime } from '../hooks/useCheckoutNotifications';

const Layout = () => {
  // El estado 'sidebarOpen' sigue viviendo aquí, como el "cerebro" del layout.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [checkoutAlerts, setCheckoutAlerts] = useState([]);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { requestPermission, notifyCheckouts } = useCheckoutNotifications();
  const { shouldAlert } = useAlertTime(9); // 9 AM

  // Creamos una función 'toggle' para que sea más fácil de entender.
  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  // Solicitar permisos de notificación al montar (solo para recepcionistas)
  useEffect(() => {
    if (user?.role === 'receptionist') {
      requestPermission();
    }
  }, [user, requestPermission]);

  // Cargar alertas y mostrar modal/notificación cuando sea hora
  useEffect(() => {
    if (!shouldAlert || user?.role !== 'receptionist') return;

    const loadAlertsAndNotify = async () => {
      try {
        const data = await fetchCheckoutAlerts();
        setCheckoutAlerts(data);
        
        if (data.length > 0) {
          // Mostrar modal en login
          setModalOpen(true);
          
          // Mostrar notificación del navegador
          notifyCheckouts(data.length, () => {
            navigate('/checkout-alerts');
          });
        }
      } catch (error) {
        console.error('Error al cargar alertas de checkout:', error);
      }
    };

    loadAlertsAndNotify();
  }, [shouldAlert, user, notifyCheckouts, navigate]);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      
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
      
      {/* Modal de alertas de checkout */}
      <CheckoutAlertModal 
        open={modalOpen}
        onOpenChange={setModalOpen}
        alerts={checkoutAlerts}
      />
    </div>
  );
};

export default Layout;