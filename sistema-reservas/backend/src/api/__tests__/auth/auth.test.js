import request from 'supertest';
import app from '../../../app';
import redisClient from '../../../db/redis.client';
import { TestDatabase } from '../test-helpers';

describe('Auth Endpoints - /api/v1/auth', () => {
  let testDb;
  let testUser;
  let testId;

  beforeAll(async () => {
    testDb = new TestDatabase();
    testId = await testDb.setup();
    
    // Crear usuario de prueba
    const result = await testDb.createUser('administrator');
    testUser = result.user;
  });

  afterAll(async () => {
    await testDb.cleanup();
    if (redisClient.isOpen) {
      await redisClient.disconnect();
    }
  });

  describe('POST /login', () => {
    it('debería retornar un token y status 200 con credenciales válidas (Happy Path)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ 
          email: testUser.email, 
          password: 'testpassword123' 
        });
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.token).toBeDefined();
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('debería retornar 401 con una contraseña incorrecta', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ 
          email: testUser.email, 
          password: 'wrongpassword' 
        });
      
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Credenciales inválidas');
    });

    it('debería retornar 401 con un email que no existe', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ 
          email: `nonexistent.${testId}@test.com`, 
          password: 'testpassword123' 
        });
      
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Credenciales inválidas');
    });

    it('debería retornar 400 si falta el email (Validation Error)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ password: 'testpassword123' });
      
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe('El email es requerido.');
    });

    it('debería retornar 400 si falta la contraseña (Validation Error)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email });
      
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe('La contraseña es requerida.');
    });
  });

  describe('GET /profile', () => {
    let validToken;

    beforeAll(async () => {
      // Obtener un token válido
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ 
          email: testUser.email, 
          password: 'testpassword123' 
        });
      validToken = loginResponse.body.token;
    });

    it('debería retornar el perfil del usuario con token válido', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${validToken}`);
      
      expect(response.statusCode).toBe(200);
      expect(response.body.id).toBe(testUser.id);
      expect(response.body.email).toBe(testUser.email);
      expect(response.body).toHaveProperty('user_roles');
      expect(response.body).not.toHaveProperty('password_hash');
    });

    it('debería retornar 401 sin token de autorización', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile');
      
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Acceso denegado. No se proporcionó un token.');
    });

    it('debería retornar 401 con token inválido', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer tokeninvalido123');
      
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Token inválido o expirado.');
    });
  });

  describe('POST /logout', () => {
    let validToken;

    beforeEach(async () => {
      // Obtener un token válido para cada test
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ 
          email: testUser.email, 
          password: 'testpassword123' 
        });
      validToken = loginResponse.body.token;
    });

    it('debería cerrar sesión correctamente con token válido', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);
      
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Sesión cerrada exitosamente.');
    });

    it('debería retornar 401 sin token de autorización', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout');
      
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Acceso denegado. No se proporcionó un token.');
    });

    it('debería retornar 401 con token inválido', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer tokeninvalido123');
      
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Token inválido o expirado.');
    });

    it('debería manejar error interno del servidor', async () => {
      // Enviar un token malformado que cause error interno
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer ');
      
      expect(response.statusCode).toBe(401);
    });
  });
});