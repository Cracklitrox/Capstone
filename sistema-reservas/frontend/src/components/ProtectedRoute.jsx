import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'; // Importamos nuestro hook

/**
 * Este componente es el guardián de nuestras rutas. Ahora utiliza el contexto de autenticación.
 * 1. Usa el hook `useAuth` para obtener el estado de `user` y `loading`.
 * 2. Muestra un mensaje de "Cargando..." mientras el contexto verifica el token.
 * Esto previene que el usuario sea redirigido al login incorrectamente si la página recarga.
 * 3. Si no hay usuario (después de cargar), redirige a la página de /login.
 * 4. Si se especifican roles permitidos, valida que el usuario tenga uno de esos roles.
 * 5. Si hay un usuario y tiene los permisos necesarios, permite el acceso a la ruta solicitada (renderiza `children`).
 */
const ProtectedRoute = ({ children, allowedRoles = null }) => {
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

  // Si se especificaron roles permitidos, validamos que el usuario tenga uno de esos roles
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-800 mb-2">Acceso Denegado</h2>
          <p className="text-red-600 mb-4">
            No tienes permisos para acceder a esta página.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  // Si hay un usuario y tiene los permisos necesarios, renderizamos el componente hijo.
  return children;
};

export default ProtectedRoute;
