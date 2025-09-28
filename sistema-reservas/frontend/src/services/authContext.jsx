import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    
    if (user && user.role) {
      root.setAttribute('data-theme', user.role);
    } else {
      root.removeAttribute('data-theme');
    }
  }, [isDarkMode, user]);

  // 1. Estabilizamos la función toggleTheme con useCallback.
  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    navigate('/login');
  }, [navigate]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const decodedUser = jwtDecode(token);
      const isValidRole = decodedUser.role && (decodedUser.role === 'administrator' || decodedUser.role === 'receptionist');
      const isTokenAlive = decodedUser.exp * 1000 > Date.now();
      if (isTokenAlive && isValidRole) setUser(decodedUser);
      else logout();
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  const login = useCallback((newToken) => {
    localStorage.setItem('token', newToken);
    const decodedUser = jwtDecode(newToken);
    setUser(decodedUser);
    setToken(newToken);
    navigate('/');
  }, [navigate]);
  
  // 2. Estabilizamos el objeto 'value' con useMemo.
  //    Esto asegura que los componentes hijos solo se actualicen cuando los datos realmente cambien.
  const value = useMemo(() => ({
    user,
    token,
    loading,
    login,
    logout,
    isDarkMode,
    toggleTheme,
  }), [user, token, loading, login, logout, isDarkMode, toggleTheme]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};