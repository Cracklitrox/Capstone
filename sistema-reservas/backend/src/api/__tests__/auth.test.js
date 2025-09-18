import request from 'supertest';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import redisClient from '../../db/redis.client';

describe('Auth Endpoints - /api/v1/auth', () => {
  let prisma;

  beforeAll(async () => {
    prisma = new PrismaClient();
    const timestamp = Date.now();
    
    const testRole = await prisma.roles.upsert({
      where: { name: 'administrator' },
      update: {},
      create: { name: 'administrator' }
    });
    
    const passwordHash = await bcrypt.hash('password123', 10);
    const testUser = await prisma.users.create({
      data: {
        rut: `8765432${timestamp % 10}`, rut_dv: '8', // RUT único
        first_name: 'Auth', paternal_last_name: 'User',
        email: `auth.test.${timestamp}@test.com`, // Email único
        password_hash: passwordHash, status: 'active',
      },
    });
    await prisma.user_roles.create({ data: { user_id: testUser.id, role_id: testRole.id } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await redisClient.disconnect();
  });

  describe('POST /login', () => {
    it('debería retornar un token y status 200 con credenciales válidas (Happy Path)', async () => {
      const timestamp = Date.now();
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: `auth.test.${timestamp}@test.com`, password: 'password123' });
      
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('debería retornar 401 con una contraseña incorrecta', async () => {
      const timestamp = Date.now();
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: `auth.test.${timestamp}@test.com`, password: 'wrongpassword' });
      
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Credenciales inválidas');
    });

    it('debería retornar 401 con un email que no existe', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'password123' });
      
      expect(response.statusCode).toBe(401);
    });

    it('debería retornar 400 si falta el email (Validation Error)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ password: 'password123' });
      
      expect(response.statusCode).toBe(400);
    });

    it('debería retornar 400 si falta la contraseña (Validation Error)', async () => {
      const timestamp = Date.now();
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: `auth.test.${timestamp}@test.com` });
      
      expect(response.statusCode).toBe(400);
    });
  });
});