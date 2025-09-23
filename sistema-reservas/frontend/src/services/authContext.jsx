import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate, useLocation } from 'react-router-dom';

// 1. Creamos el contexto que compartirá la información
const AuthContext = createContext();

// 2. Creamos un "Hook" personalizado para que cualquier componente
// pueda acceder fácilmente a la información del usuario (ej: useAuth())
export const useAuth = () => {
  return useContext(AuthContext);
};

// 3. Creamos el "Proveedor" del contexto. Este es el componente que
// envolverá toda nuestra aplicación para darle acceso al cerebro de la autenticación.
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true); // Para evitar parpadeos al cargar
  const navigate = useNavigate();
  const location = useLocation();

  // Este efecto se ejecuta cada vez que la página se carga o el token cambia
  useEffect(() => {
    try {
      if (token) {
        const decodedUser = jwtDecode(token);

        // Verificamos que el token no haya expirado
        if (decodedUser.exp * 1000 > Date.now()) {
          setUser(decodedUser);
        } else {
          // Si el token expiró, limpiamos todo
          logout();
        }
      }
    } catch (error) {
      console.error("Token inválido o malformado:", error);
      // Si el token es inválido, lo limpiamos para evitar problemas
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Función para manejar el inicio de sesión
  const login = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    const decodedUser = jwtDecode(newToken);
    setUser(decodedUser);
    // Redirigimos a la página principal después del login
    navigate('/');
  };

  // Función para manejar el cierre de sesión
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    // Redirigimos al login después de cerrar sesión
    navigate('/login');
  };

  // El "valor" que será compartido con todos los componentes hijos
  const value = {
    user,
    token,
    loading,
    login,
    logout,
  };

  // No mostramos la aplicación hasta que hayamos verificado el token
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
