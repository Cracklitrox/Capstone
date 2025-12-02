import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { profileService } from "../services/profileService";
import { useApiCache } from "../hooks/useApiCache";
import { AuthContext } from "../contexts/AuthContext";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    () => localStorage.getItem("token") || null
  );
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { cachedFetch } = useApiCache(5000); // 5 segundos de caché

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", isDarkMode);
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");

    if (user && user.role) {
      root.setAttribute("data-theme", user.role);
    } else {
      root.removeAttribute("data-theme");
    }
  }, [isDarkMode, user]);

  const toggleTheme = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    navigate("/login");
  }, [navigate]);

  // Función para aplicar preferencias del usuario CON CACHÉ
  const applyUserPreferences = useCallback(async () => {
    try {
      const preferences = await cachedFetch('user-preferences', () => profileService.getMyPreferences());

      if (preferences.defaultTheme) {
        if (preferences.defaultTheme === "system") {
          const systemPrefersDark = window.matchMedia(
            "(prefers-color-scheme: dark)"
          ).matches;
          setIsDarkMode(systemPrefersDark);
        } else {
          setIsDarkMode(preferences.defaultTheme === "dark");
        }
      }

      if (
        preferences.defaultDashboard &&
        preferences.defaultDashboard !== "main"
      ) {
        navigate(`/${preferences.defaultDashboard}`);
      }
    } catch (error) {
      if (error.response?.status === 400) {
      } else {
      }
    }
  }, [navigate, cachedFetch]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const decodedUser = jwtDecode(token);
      const isValidRole =
        decodedUser.role &&
        (decodedUser.role === "administrator" ||
          decodedUser.role === "receptionist");
      const isTokenAlive = decodedUser.exp * 1000 > Date.now();
      if (isTokenAlive && isValidRole) {
        setUser(decodedUser);
        // Aplicar preferencias después de validar el usuario
        applyUserPreferences();
      } else {
        logout();
      }
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }, [token, logout, applyUserPreferences]);

  const login = useCallback(
    (newToken) => {
      localStorage.setItem("token", newToken);
      const decodedUser = jwtDecode(newToken);
      setUser(decodedUser);
      setToken(newToken);

      profileService
        .getMyPreferences()
        .then((preferences) => {
          if (preferences.defaultTheme) {
            if (preferences.defaultTheme === "system") {
              const systemPrefersDark = window.matchMedia(
                "(prefers-color-scheme: dark)"
              ).matches;
              setIsDarkMode(systemPrefersDark);
            } else {
              setIsDarkMode(preferences.defaultTheme === "dark");
            }
          }

          if (
            preferences.defaultDashboard &&
            preferences.defaultDashboard !== "main"
          ) {
            navigate(`/${preferences.defaultDashboard}`);
          } else {
            navigate("/");
          }
        })
        .catch((error) => {
          if (error.response?.status === 400) {
          } else {
          }
          navigate("/");
        });
    },
    [navigate]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      isDarkMode,
      toggleTheme,
    }),
    [user, token, loading, login, logout, isDarkMode, toggleTheme]
  );

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
