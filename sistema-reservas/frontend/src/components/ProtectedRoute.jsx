import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/authContext.jsx'; // Importamos nuestro hook

/**
 * Este componente es el guardián de nuestras rutas. Ahora utiliza el contexto de autenticación.
 * 1. Usa el hook `useAuth` para obtener el estado de `user` y `loading`.
 * 2. Muestra un mensaje de "Cargando..." mientras el contexto verifica el token.
 * Esto previene que el usuario sea redirigido al login incorrectamente si la página recarga.
 * 3. Si no hay usuario (después de cargar), redirige a la página de /login.
 * 4. Si hay un usuario, permite el acceso a la ruta solicitada (renderiza `children`).
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Mientras el contexto está verificando el token, mostramos una pantalla de carga.
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div>Cargando sesión...</div>
      </div>
    );
  }

  // Si después de cargar no hay usuario, lo redirigimos al login.
  // Guardamos la ubicación actual para que, después del login, pueda volver aquí.
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si hay un usuario, renderizamos el componente hijo (en este caso, el Layout).
  return children;
};

export default ProtectedRoute;
