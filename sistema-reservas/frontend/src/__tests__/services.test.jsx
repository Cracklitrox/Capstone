import { vi, describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';
import { reservationService } from '../services/services';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const API_URL = 'http://localhost:3001/api/v1';

describe('reservationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getReservations', () => {
    it('debería llamar a axios.get con la URL correcta y devolver los datos', async () => {
      const mockReservations = [{ id: 1, name: 'Reserva 1' }];
      axios.get.mockResolvedValue({ data: mockReservations });

      const result = await reservationService.getReservations();

      expect(axios.get).toHaveBeenCalledWith(`${API_URL}/reservations`);
      expect(result).toEqual(mockReservations);
    });

    it('debería lanzar un error si la petición falla', async () => {
      const error = new Error('API Error');
      axios.get.mockRejectedValue(error);

      await expect(reservationService.getReservations()).rejects.toThrow('API Error');
    });
  });

  describe('createReservation', () => {
    it('debería llamar a axios.post con los datos correctos y devolver la nueva reserva', async () => {
      const reservationData = { guestName: 'Carlos', roomNumber: 101 };
      const newReservation = { id: 2, ...reservationData };

      axios.post.mockResolvedValue({ data: newReservation });

      const result = await reservationService.createReservation(reservationData);

      expect(axios.post).toHaveBeenCalledWith(`${API_URL}/reservations`, reservationData);
      expect(result).toEqual(newReservation);
    });
  });
});