import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

/**
 * Hook para acceder al contexto de autenticación
 * Exportado en un archivo separado para compatibilidad con Fast Refresh
 */
export const useAuth = () => {
  return useContext(AuthContext);
};
