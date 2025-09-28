import React from "react";
import { Routes, Route } from "react-router-dom";
import { useAuth } from "./services/authContext.jsx";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

// --- Páginas Principales ---
import Login from "./pages/Login.jsx";
import AdminDashboard from "./pages/Admin/Dashboard.jsx";
import ReceptionistDashboard from "./pages/Receptionist/Dashboard.jsx";
import TapeChart from "./pages/Receptionist/TapeChart.jsx"; // 1. IMPORTAMOS LA NUEVA PÁGINA

import "./index.css";

// --- Páginas de Contenido (Placeholder) ---
const ReservationsPage = () => <h1 className="text-3xl font-bold">Gestionar Reservas</h1>;
const UsersPage = () => <h1 className="text-3xl font-bold">Gestionar Usuarios</h1>;
const SettingsPage = () => <h1 className="text-3xl font-bold">Configuración</h1>;
const NotFoundPage = () => <h1 className="text-3xl font-bold text-center mt-10">404 - Página no encontrada</h1>;

// --- Componente Inteligente para el Dashboard ---
const DashboardSelector = () => {
  const { user } = useAuth();
  if (!user) return <div>Cargando...</div>;

  switch (user.role) {
    case 'administrator':
      return <AdminDashboard />;
    case 'receptionist':
      return <ReceptionistDashboard />;
    default:
      return <div>Rol de usuario no reconocido.</div>;
  }
};

// --- Definición de Rutas ---
const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardSelector />} />
        
        {/* --- CAMBIO AQUÍ: AÑADIMOS LA RUTA PARA EL PLANNING --- */}
        <Route path="planning" element={<TapeChart />} /> 
        
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

// --- Componente Principal ---
function App() {
  return <AppRoutes />;
}

export default App;