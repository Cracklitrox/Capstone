import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Configuramos un "interceptor" para agregar el token a todas las peticiones.
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

// Creamos un objeto con todas las funciones para la autenticación.
export const authService = {
  /**
   * Envía las credenciales al endpoint de login.
   * @param {object} credentials - { email, password }
   * @returns {Promise<object>} La respuesta del servidor (incluyendo el token).
   */
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  /**
   * Obtiene el perfil del usuario autenticado.
   * El token se añade automáticamente gracias al interceptor.
   * @returns {Promise<object>} Los datos del perfil del usuario.
   */
  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  /**
   * Cierra la sesión del usuario.
   * @returns {Promise<object>} La respuesta del servidor.
   */
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },
};

// Aquí podrías agregar otros servicios, como el de reservaciones
// export const reservationService = { ... };
// Agregar segun separación de modulos a futuro