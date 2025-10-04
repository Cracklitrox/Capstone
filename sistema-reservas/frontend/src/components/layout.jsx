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
  
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { requestPermission, notifyCheckouts } = useCheckoutNotifications();
  const { shouldAlert, markAsRead } = useAlertTime(0); // TEMPORAL: 0 AM para testing (cambiar a 9 cuando se corrija la hora)

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
    console.log('🔍 DEBUG - useEffect ejecutado:', {
      user: user?.email,
      role: user?.role,
      tokenLength: token?.length,
      shouldAlert
    });

    // Primero verificar que el usuario esté autenticado
    if (!user || !token || user.role !== 'receptionist') {
      console.log('❌ Validación falló - no se ejecutará la carga de alertas');
      return;
    }
    
    // Luego verificar si debe mostrar alerta
    if (!shouldAlert) {
      console.log('⏸️ shouldAlert es false - no es hora de mostrar alertas');
      return;
    }

    console.log('✅ Todas las validaciones pasaron - programando carga de alertas');

    // Pequeño delay para asegurar que el token esté completamente disponible
    const timeoutId = setTimeout(() => {
      const loadAlertsAndNotify = async () => {
        try {
          console.log('📡 Enviando petición con token:', token.substring(0, 20) + '...');
          const data = await fetchCheckoutAlerts(token);
          
          console.log('📦 Datos recibidos:', data);
          
          if (data && data.data) {
            setCheckoutAlerts(data);
            
            if (data.data.length > 0) {
              // Mostrar modal en login
              setModalOpen(true);
              
              // Mostrar notificación del navegador
              notifyCheckouts(data.data.length, () => {
                navigate('/checkout-alerts');
              });
            }
          }
        } catch (error) {
          console.error('💥 Error al cargar alertas de checkout:', error);
          console.error('💥 Token usado:', token?.substring(0, 20) + '...');
          // Si el token es inválido, no hacer nada (el usuario ya está en la página)
        }
      };

      loadAlertsAndNotify();
    }, 500); // Esperar 500ms para que el contexto se actualice

    return () => clearTimeout(timeoutId);
  }, [shouldAlert, user, token, notifyCheckouts, navigate]);

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
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        alertsData={checkoutAlerts}
        onMarkAsRead={markAsRead}
      />
    </div>
  );
};

export default Layout;