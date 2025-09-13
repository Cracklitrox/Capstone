import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom"; // Importar BrowserRouter y Routes
import Login from "./pages/login"; // Página de login
import AdminHome from "./pages/Admin/home"; // Página de login
import ReceptionistHome from "./pages/Receptionist/home"; // Página de login

import "./index.css"; // Tailwind CSS

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        {/* Definir las rutas */}
        <Routes>
          <Route path="/" element={<Login />} /> {/* Página de Logueo */}
          <Route path="/admin" element={<AdminHome />} /> {/* Página de Admin */}
          <Route path="/receptionist" element={<ReceptionistHome />} /> {/* Página de Recepcionista */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
