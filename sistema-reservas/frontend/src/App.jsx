import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { NotificationsProvider } from "./contexts/NotificationsContext.jsx";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Profile from "./components/Profile";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { Loader2 } from "lucide-react";

// --- Páginas con Lazy Loading ---
import Login from "./pages/Login.jsx";

// Admin pages (lazy)
const AdminDashboard = lazy(() => import("./pages/Admin/Dashboard.jsx"));
const RoomsCrud = lazy(() => import("./pages/Admin/RoomsCrud.jsx"));
const RoomTypesCrud = lazy(() => import("./pages/Admin/RoomTypesCrud.jsx"));
const RoomStatusBoard = lazy(() => import("./pages/Admin/RoomStatusBoard.jsx"));

// Rooms pages (lazy)
const RoomsPending = lazy(() => import("./pages/Rooms/RoomsPending.jsx"));

// Receptionist pages (lazy)
const ReceptionistDashboard = lazy(() => import("./pages/Receptionist/Dashboard.jsx"));
const TapeChart = lazy(() => import("./pages/Receptionist/TapeChart.jsx"));
const ReservationHistory = lazy(() => import("./pages/Receptionist/ReservationHistory.jsx"));
const CheckoutAlertsImproved = lazy(() => import("./pages/Receptionist/CheckoutAlerts.jsx"));
const GuestHistory = lazy(() => import("./pages/Receptionist/GuestHistory.jsx"));

// Reservations pages (lazy)
const NewReservation = lazy(() => import("./pages/Reservations/NewReservation.jsx"));
const ManageReservations = lazy(() => import("./pages/Reservations/ManageReservations.jsx"));
const CheckinsToday = lazy(() => import("./pages/Reservations/CheckinsToday.jsx"));
const CheckoutsToday = lazy(() => import("./pages/Reservations/CheckoutsToday.jsx"));
const InProgress = lazy(() => import("./pages/Reservations/InProgress.jsx"));

// Other pages (lazy)
const NotificationsPage = lazy(() => import("./pages/NotificationsPage.jsx"));

import "./index.css";

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Cargando página...</p>
    </div>
  </div>
);

// --- Páginas de Contenido (Placeholder) ---
const ReservationsPage = () => (
  <h1 className="text-3xl font-bold">Gestionar Reservas</h1>
);
const UsersPage = () => (
  <h1 className="text-3xl font-bold">Gestionar Usuarios</h1>
);
const SettingsPage = () => (
  <h1 className="text-3xl font-bold">Configuración</h1>
);
const NotFoundPage = () => (
  <h1 className="text-3xl font-bold text-center mt-10">
    404 - Página no encontrada
  </h1>
);

// --- Componente Inteligente para el Dashboard ---
const DashboardSelector = () => {
  const { user } = useAuth();
  if (!user) return <div>Cargando...</div>;

  switch (user.role) {
    case "administrator":
      return <AdminDashboard />;
    case "receptionist":
      return <ReceptionistDashboard />;
    default:
      return <div>Rol de usuario no reconocido.</div>;
  }
};

// --- Definición de Rutas ---
const AppRoutes = () => {
  const token = localStorage.getItem('token');

  return (
    <NotificationsProvider token={token}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Rutas Protegidas */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<DashboardSelector />} />
            <Route path="planning" element={<TapeChart />} />
            <Route path="checkout-alerts" element={<CheckoutAlertsImproved />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="reservations" element={<ReservationsPage />} />
            <Route path="history" element={<ReservationHistory />} />
            <Route path="guests" element={<GuestHistory />} />
            <Route path="reservations/new" element={<NewReservation />} />
            <Route path="reservations/manage" element={<ManageReservations />} />
            <Route path="reservations/checkins-today" element={<CheckinsToday />} />
            <Route path="reservations/checkouts-today" element={<CheckoutsToday />} />
            <Route path="reservations/in-progress" element={<InProgress />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<Profile />} />
            <Route path="rooms/pending" element={<RoomsPending />} />
            <Route path="admin/rooms-crud" element={<RoomsCrud />} />
            <Route path="admin/room-types-crud" element={<RoomTypesCrud />} />
            <Route path="admin/room-status-board" element={<RoomStatusBoard />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </NotificationsProvider>
  );
};

// --- Componente Principal ---
function App() {
  return (
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  );
}

export default App;
