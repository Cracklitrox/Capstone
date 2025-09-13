import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Este componente actúa como un guardián para las rutas.
 * Comprueba si existe un token de autenticación en el localStorage.
 * - Si existe, permite el acceso a la ruta solicitada (renderiza `children`).
 * - Si no existe, redirige al usuario a la página de login ('/').
 */
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;