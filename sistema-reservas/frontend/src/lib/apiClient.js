/**
 * Cliente centralizado de API
 * Configura axios con base URL, autenticación y manejo de errores consistente
 */
import axios from 'axios';

// URL base de la API desde variables de entorno o fallback
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

/**
 * Instancia de axios configurada con base URL
 */
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Interceptor de request para agregar token de autenticación
 */
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/**
 * Interceptor de response para manejo centralizado de errores
 */
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Manejo de errores 401 (no autorizado)
        if (error.response?.status === 401) {
            // Token expirado o inválido
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

/**
 * Helper para obtener headers de autenticación (por compatibilidad con código legacy)
 * @deprecated Usar apiClient directamente en su lugar
 */
export const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };
};

export default apiClient;
