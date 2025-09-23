import React from "react";
import { Routes, Route } from "react-router-dom";
import { useAuth } from "./services/authContext";

// Páginas y componentes principales
import Login from "./pages/Login";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

// Dashboards específicos por rol
import AdminDashboard from "./pages/Admin/Dashboard";
import ReceptionistDashboard from "./pages/Receptionist/Dashboard";

import "./index.css";

// --- Componente Inteligente ---
// Decide qué Dashboard mostrar basado en el rol del usuario en el contexto.
const DashboardSelector = () => {
  const { user } = useAuth();

  if (!user) {
    return <div>Cargando...</div>;
  }

  console.log("Rol recibido del contexto:", user.role);

  // Comparamos con los nombres de rol exactos de tu base de datos
  switch (user.role) {
    case 'administrator':
      return <AdminDashboard />;
    case 'receptionist':
      return <ReceptionistDashboard />;
    default:
      return <div>Rol de usuario '{user.role}' no reconocido. Contacte al soporte.</div>;
  }
};

// --- Definición de Rutas ---
// Separamos las rutas en su propio componente para mayor claridad.
const AppRoutes = () => {
  return (
    <Routes>
      {/* Rutas Públicas */}
      <Route path="/login" element={<Login />} />

      {/* Rutas Protegidas */}
      {/* Todas las rutas dentro de este elemento usarán el Layout y estarán protegidas */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* La ruta "index" es la página por defecto al entrar a "/" */}
        <Route index element={<DashboardSelector />} />

        {/* AQUÍ AGREGARÁS TUS OTRAS RUTAS EN EL FUTURO.
          React Router anidará estos componentes dentro del <Outlet /> del Layout.
          Ejemplo:
          <Route path="admin/gestion-personal" element={<StaffPage />} />
          <Route path="recepcionista/reservas" element={<ReservationsPage />} />
        */}
      </Route>

      {/* Puedes agregar una ruta para páginas no encontradas */}
      <Route path="*" element={<div>Página no encontrada</div>} />
    </Routes>
  );
};


// --- Componente Principal App ---
// Su única responsabilidad ahora es proveer el contexto de autenticación.
function App() {
  return <AppRoutes />;
}

export default App;
