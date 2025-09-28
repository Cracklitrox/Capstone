import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { authService, reservationService } from '../../services/services.jsx';
import { mockAxiosResponses, cleanupMocks } from '../utils/testUtils.jsx';

// Mock de axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('Services', () => {
  beforeEach(() => {
    cleanupMocks();
    vi.clearAllMocks();
  });

  describe('authService', () => {
    describe('login', () => {
      it('debe realizar login exitosamente con credenciales válidas', async () => {
        const credentials = {
          email: 'admin@hotel.com',
          password: 'password123'
        };

        axios.post.mockResolvedValue(mockAxiosResponses.loginSuccess);

        const result = await authService.login(credentials);

        expect(axios.post).toHaveBeenCalledWith(
          'http://localhost:3001/api/v1/auth/login',
          credentials
        );
        expect(result).toEqual(mockAxiosResponses.loginSuccess.data);
      });

      it('debe manejar credenciales incorrectas', async () => {
        const credentials = {
          email: 'wrong@email.com',
          password: 'wrongpassword'
        };

        axios.post.mockRejectedValue(mockAxiosResponses.loginError);

        await expect(authService.login(credentials))
          .rejects
          .toEqual(mockAxiosResponses.loginError);

        expect(axios.post).toHaveBeenCalledWith(
          'http://localhost:3001/api/v1/auth/login',
          credentials
        );
      });

      it('debe manejar errores de red', async () => {
        const credentials = {
          email: 'admin@hotel.com',
          password: 'password123'
        };

        const networkError = new Error('Network Error');
        axios.post.mockRejectedValue(networkError);

        await expect(authService.login(credentials))
          .rejects
          .toThrow('Network Error');
      });

      it('debe manejar errores del servidor (500)', async () => {
        const credentials = {
          email: 'admin@hotel.com',
          password: 'password123'
        };

        const serverError = {
          response: {
            status: 500,
            data: { message: 'Internal Server Error' }
          }
        };

        axios.post.mockRejectedValue(serverError);

        await expect(authService.login(credentials))
          .rejects
          .toEqual(serverError);
      });

      it('debe manejar respuesta sin token', async () => {
        const credentials = {
          email: 'admin@hotel.com',
          password: 'password123'
        };

        const responseWithoutToken = {
          data: { message: 'Login successful' } // Sin token
        };

        axios.post.mockResolvedValue(responseWithoutToken);

        const result = await authService.login(credentials);
        expect(result).toEqual(responseWithoutToken.data);
      });

      it('debe validar que se envían las credenciales correctas', async () => {
        const credentials = {
          email: 'test@hotel.com',
          password: 'testpass'
        };

        axios.post.mockResolvedValue({ data: { token: 'test-token' } });

        await authService.login(credentials);

        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(axios.post).toHaveBeenCalledWith(
          'http://localhost:3001/api/v1/auth/login',
          {
            email: 'test@hotel.com',
            password: 'testpass'
          }
        );
      });

      it('debe manejar timeout de solicitud', async () => {
        const credentials = {
          email: 'admin@hotel.com',
          password: 'password123'
        };

        const timeoutError = {
          code: 'ECONNABORTED',
          message: 'timeout of 5000ms exceeded'
        };

        axios.post.mockRejectedValue(timeoutError);

        await expect(authService.login(credentials))
          .rejects
          .toEqual(timeoutError);
      });
    });

    describe('Configuración de API', () => {
      it('debe usar la URL correcta del API', async () => {
        const credentials = { email: 'test@test.com', password: 'test' };
        axios.post.mockResolvedValue({ data: { token: 'test' } });

        await authService.login(credentials);

        const callUrl = axios.post.mock.calls[0][0];
        expect(callUrl).toBe('http://localhost:3001/api/v1/auth/login');
      });
    });
  });

  describe('reservationService', () => {
    describe('getReservations', () => {
      it('debe obtener reservas exitosamente', async () => {
        axios.get.mockResolvedValue(mockAxiosResponses.reservationsSuccess);

        const result = await reservationService.getReservations();

        expect(axios.get).toHaveBeenCalledWith('http://localhost:3001/api/v1/reservations');
        expect(result).toEqual(mockAxiosResponses.reservationsSuccess.data);
      });

      it('debe manejar error al obtener reservas', async () => {
        const error = {
          response: {
            status: 403,
            data: { message: 'Access denied' }
          }
        };

        axios.get.mockRejectedValue(error);

        await expect(reservationService.getReservations())
          .rejects
          .toEqual(error);

        expect(axios.get).toHaveBeenCalledWith('http://localhost:3001/api/v1/reservations');
      });

      it('debe manejar respuesta vacía', async () => {
        const emptyResponse = { data: [] };
        axios.get.mockResolvedValue(emptyResponse);

        const result = await reservationService.getReservations();

        expect(result).toEqual([]);
        expect(axios.get).toHaveBeenCalledTimes(1);
      });

      it('debe manejar error de autorización', async () => {
        const authError = {
          response: {
            status: 401,
            data: { message: 'Unauthorized' }
          }
        };

        axios.get.mockRejectedValue(authError);

        await expect(reservationService.getReservations())
          .rejects
          .toEqual(authError);
      });

      it('debe manejar error de servidor', async () => {
        const serverError = {
          response: {
            status: 500,
            data: { message: 'Internal server error' }
          }
        };

        axios.get.mockRejectedValue(serverError);

        await expect(reservationService.getReservations())
          .rejects
          .toEqual(serverError);
      });

      it('debe usar la URL correcta', async () => {
        axios.get.mockResolvedValue({ data: [] });

        await reservationService.getReservations();

        const callUrl = axios.get.mock.calls[0][0];
        expect(callUrl).toBe('http://localhost:3001/api/v1/reservations');
      });
    });

    describe('createReservation', () => {
      it('debe crear reserva exitosamente', async () => {
        const reservationData = {
          main_guest_id: 1,
          channel: 'reception',
          check_in_date: '2025-01-15T14:00:00Z',
          check_out_date: '2025-01-17T12:00:00Z',
          guest_count: 2,
          rooms: [{ room_id: 1, unit_price: 50000 }]
        };

        const createdReservation = {
          data: {
            id: 1,
            code: 'RSV-001',
            ...reservationData,
            status: 'pending',
            total_amount: 100000,
            created_at: '2025-01-10T10:00:00Z'
          }
        };

        axios.post.mockResolvedValue(createdReservation);

        const result = await reservationService.createReservation(reservationData);

        expect(axios.post).toHaveBeenCalledWith(
          'http://localhost:3001/api/v1/reservations',
          reservationData
        );
        expect(result).toEqual(createdReservation.data);
      });

      it('debe manejar datos de reserva incompletos', async () => {
        const incompleteData = {
          main_guest_id: 1,
          // Faltan campos requeridos
        };

        const validationError = {
          response: {
            status: 400,
            data: { 
              message: 'Validation error',
              errors: [
                'check_in_date is required',
                'check_out_date is required',
                'guest_count is required'
              ]
            }
          }
        };

        axios.post.mockRejectedValue(validationError);

        await expect(reservationService.createReservation(incompleteData))
          .rejects
          .toEqual(validationError);
      });

      it('debe manejar conflictos de disponibilidad', async () => {
        const reservationData = {
          main_guest_id: 1,
          channel: 'reception',
          check_in_date: '2025-01-15T14:00:00Z',
          check_out_date: '2025-01-17T12:00:00Z',
          guest_count: 2,
          rooms: [{ room_id: 1, unit_price: 50000 }]
        };

        const conflictError = {
          response: {
            status: 409,
            data: { 
              message: 'Room not available for selected dates',
              conflicting_room_id: 1
            }
          }
        };

        axios.post.mockRejectedValue(conflictError);

        await expect(reservationService.createReservation(reservationData))
          .rejects
          .toEqual(conflictError);
      });

      it('debe manejar error de huésped no encontrado', async () => {
        const reservationData = {
          main_guest_id: 999, // ID que no existe
          channel: 'reception',
          check_in_date: '2025-01-15T14:00:00Z',
          check_out_date: '2025-01-17T12:00:00Z',
          guest_count: 2
        };

        const notFoundError = {
          response: {
            status: 404,
            data: { message: 'Guest not found' }
          }
        };

        axios.post.mockRejectedValue(notFoundError);

        await expect(reservationService.createReservation(reservationData))
          .rejects
          .toEqual(notFoundError);
      });

      it('debe crear reserva con servicios adicionales', async () => {
        const reservationWithServices = {
          main_guest_id: 1,
          channel: 'reception',
          check_in_date: '2025-01-15T14:00:00Z',
          check_out_date: '2025-01-17T12:00:00Z',
          guest_count: 2,
          rooms: [{ room_id: 1, unit_price: 50000 }],
          services: [
            { service_id: 1, quantity: 2, unit_price: 15000 },
            { service_id: 2, quantity: 1, unit_price: 25000 }
          ]
        };

        const createdReservation = {
          data: {
            id: 2,
            code: 'RSV-002',
            ...reservationWithServices,
            status: 'pending',
            total_amount: 155000,
            created_at: '2025-01-10T10:00:00Z'
          }
        };

        axios.post.mockResolvedValue(createdReservation);

        const result = await reservationService.createReservation(reservationWithServices);

        expect(result.total_amount).toBe(155000);
        expect(axios.post).toHaveBeenCalledWith(
          'http://localhost:3001/api/v1/reservations',
          reservationWithServices
        );
      });

      it('debe crear reserva con múltiples habitaciones', async () => {
        const multiRoomReservation = {
          main_guest_id: 1,
          channel: 'web',
          check_in_date: '2025-01-20T14:00:00Z',
          check_out_date: '2025-01-22T12:00:00Z',
          guest_count: 4,
          rooms: [
            { room_id: 1, unit_price: 50000 },
            { room_id: 2, unit_price: 60000 }
          ]
        };

        const createdReservation = {
          data: {
            id: 3,
            code: 'RSV-003',
            ...multiRoomReservation,
            status: 'pending',
            total_amount: 220000,
            created_at: '2025-01-10T10:00:00Z'
          }
        };

        axios.post.mockResolvedValue(createdReservation);

        const result = await reservationService.createReservation(multiRoomReservation);

        expect(result.total_amount).toBe(220000);
        expect(result.rooms).toHaveLength(2);
      });

      it('debe usar la URL correcta para crear reserva', async () => {
        const reservationData = { main_guest_id: 1 };
        axios.post.mockResolvedValue({ data: { id: 1 } });

        await reservationService.createReservation(reservationData);

        const callUrl = axios.post.mock.calls[0][0];
        expect(callUrl).toBe('http://localhost:3001/api/v1/reservations');
      });

      it('debe enviar los datos exactos proporcionados', async () => {
        const reservationData = {
          main_guest_id: 5,
          channel: 'chatbot',
          check_in_date: '2025-02-01T15:00:00Z',
          check_out_date: '2025-02-03T11:00:00Z',
          guest_count: 3,
          special_requests: 'Vista al mar'
        };

        axios.post.mockResolvedValue({ data: { id: 1, ...reservationData } });

        await reservationService.createReservation(reservationData);

        expect(axios.post).toHaveBeenCalledWith(
          'http://localhost:3001/api/v1/reservations',
          reservationData
        );

        const sentData = axios.post.mock.calls[0][1];
        expect(sentData).toEqual(reservationData);
      });
    });
  });

  describe('Configuración global de servicios', () => {
    it('debe usar la misma base URL para todos los servicios', async () => {
      const baseURL = 'http://localhost:3001/api/v1';
      
      axios.post.mockResolvedValue({ data: { token: 'test' } });
      axios.get.mockResolvedValue({ data: [] });

      await authService.login({ email: 'test@test.com', password: 'test' });
      await reservationService.getReservations();

      const loginUrl = axios.post.mock.calls[0][0];
      const reservationsUrl = axios.get.mock.calls[0][0];

      expect(loginUrl).toContain(baseURL);
      expect(reservationsUrl).toContain(baseURL);
    });

    it('debe manejar errores de conectividad de forma consistente', async () => {
      const networkError = new Error('Network Error');
      networkError.code = 'NETWORK_ERROR';

      axios.post.mockRejectedValue(networkError);
      axios.get.mockRejectedValue(networkError);

      await expect(authService.login({ email: 'test', password: 'test' }))
        .rejects.toThrow('Network Error');

      await expect(reservationService.getReservations())
        .rejects.toThrow('Network Error');
    });

    it('debe preservar el formato de error original', async () => {
      const customError = {
        response: {
          status: 422,
          data: {
            message: 'Validation failed',
            errors: {
              email: ['Email format is invalid'],
              password: ['Password is too short']
            }
          }
        },
        config: { url: '/auth/login' },
        request: {}
      };

      axios.post.mockRejectedValue(customError);

      try {
        await authService.login({ email: 'invalid', password: '123' });
      } catch (error) {
        expect(error).toEqual(customError);
        expect(error.response.data.errors.email).toContain('Email format is invalid');
      }
    });
  });

  describe('Casos edge', () => {
    it('debe manejar respuestas malformadas', async () => {
      const malformedResponse = {
        data: null,
        status: 200,
        statusText: 'OK'
      };

      axios.get.mockResolvedValue(malformedResponse);

      const result = await reservationService.getReservations();
      expect(result).toBeNull();
    });

    it('debe manejar respuestas sin data', async () => {
      const responseWithoutData = {
        status: 200,
        statusText: 'OK'
      };

      axios.post.mockResolvedValue(responseWithoutData);

      const result = await authService.login({ email: 'test', password: 'test' });
      expect(result).toBeUndefined();
    });

    it('debe manejar timeouts largos', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      };

      axios.get.mockRejectedValue(timeoutError);

      await expect(reservationService.getReservations())
        .rejects
        .toMatchObject({
          code: 'ECONNABORTED',
          message: expect.stringContaining('timeout')
        });
    });
  });
});