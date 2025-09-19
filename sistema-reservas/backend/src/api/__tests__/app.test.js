import request from 'supertest';
import app from '../../app'

describe('App Configuration', () => {
  describe('GET /test', () => {
    it('debería retornar status 200 y mensaje de confirmación', async () => {
      const response = await request(app).get('/test');
      
      expect(response.statusCode).toBe(200);
      expect(response.text).toBe('¡El servidor del Hotel Don Teo está funcionando correctamente! 🏨');
    });
  });

  describe('API Routes', () => {
    it('debería retornar bienvenida en la ruta base de API', async () => {
      const response = await request(app).get('/api/v1/');
      
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Bienvenido a la API v1 del Hotel Don Teo');
    });
  });

  describe('CORS Configuration', () => {
    it('debería permitir requests sin origin (para testing)', async () => {
      const response = await request(app).get('/test');
      
      expect(response.statusCode).toBe(200);
      // CORS debería permitir el request
    });

    it('debería manejar rutas no encontradas', async () => {
      const response = await request(app).get('/ruta-inexistente');
      
      expect(response.statusCode).toBe(404);
    });
  });
});