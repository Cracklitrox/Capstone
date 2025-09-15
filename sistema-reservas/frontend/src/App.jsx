import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./pages/login";
import AdminHome from "./pages/Admin/home";
import ReceptionistHome from "./pages/Receptionist/home";
import ProtectedRoute from "./components/ProtectedRoute";

import "./index.css";

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          {/* Ruta de Login: Es pública, no necesita protección */}
          <Route path="/" element={<Login />} />

          {/* Ruta de Admin: Ahora está protegida */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminHome />
              </ProtectedRoute>
            }
          />

          {/* Ruta de Recepcionista: También protegida */}
          <Route
            path="/receptionist"
            element={
              <ProtectedRoute>
                <ReceptionistHome />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;