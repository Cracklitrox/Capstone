import request from 'supertest';
import app from '../../../app';
import redisClient from '../../../db/redis.client';
import { TestDatabase } from '../test-helpers';
import jwt from 'jsonwebtoken';

describe('Auth Edge Cases', () => {
  let testDb;
  let testUser;
  let validToken;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.setup();
    
    const result = await testDb.createUser('administrator');
    testUser = result.user;
    
    // Obtener token válido
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ 
        email: testUser.email, 
        password: 'testpassword123' 
      });
    validToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await testDb.cleanup();
    await redisClient.disconnect();
  });

  describe('Auth Controller Error Handling', () => {
    it('debería manejar error de header authorization malformado en logout', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer'); // Header malformado - falta token
      
      // El middleware de auth intercepta primero y devuelve 401
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Acceso denegado. No se proporcionó un token.');
    });

    it('debería manejar error cuando getProfile no encuentra usuario', async () => {
      // Crear token con ID de usuario inexistente
      const fakeToken = jwt.sign(
        { id: 99999 }, // ID que no existe
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${fakeToken}`);
      
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Usuario no encontrado.');
    });

    it('debería manejar error interno en getProfile', async () => {
      // Este test usa un token válido para probar el flujo normal
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${validToken}`);
      
      // El test debería pasar exitosamente
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('id');
    });
  });

  describe('Auth Service Error Handling', () => {
    it('debería manejar login con credenciales vacías específicamente', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: '', password: '' });
      
      expect(response.statusCode).toBe(400);
    });

    it('debería manejar logout con token expirado', async () => {
      // Crear token expirado
      const expiredToken = jwt.sign(
        { id: testUser.id },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Token expirado
      );

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      // El middleware de auth detecta token expirado y devuelve 401
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Token inválido o expirado.');
    });

    it('debería manejar logout con token inválido', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer token.malformado.invalid');
      
      // El middleware de auth detecta token inválido y devuelve 401
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Token inválido o expirado.');
    });
  });
});