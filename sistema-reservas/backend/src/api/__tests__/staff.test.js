import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import redisClient from '../../db/redis.client';

const prisma = new PrismaClient();

let consoleErrorSpy;
beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('Auth Middleware y Staff Endpoints', () => {
  let adminToken;
  let adminUser;

  beforeAll(async () => {
    await prisma.reservations.deleteMany({});
    await prisma.user_roles.deleteMany({});
    await prisma.roles.deleteMany({});
    await prisma.users.deleteMany({});

    const adminRole = await prisma.roles.create({ data: { name: 'administrator' } });
    const passwordHash = await bcrypt.hash('password123', 10);
    adminUser = await prisma.users.create({
      data: {
        rut: '98765432',
        rut_dv: '1',
        first_name: 'Admin',
        paternal_last_name: 'Test',
        email: 'admin@test.com',
        password_hash: passwordHash,
        status: 'active',
      },
    });
    await prisma.user_roles.create({ data: { user_id: adminUser.id, role_id: adminRole.id } });
    adminToken = jwt.sign({ id: adminUser.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await redisClient.disconnect();
  });

  describe('Middleware de Autenticación', () => {
    it('debería devolver 401 si no se provee el header de Authorization', async () => {
      const response = await request(app).get('/api/v1/staff');
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Acceso denegado. No se proporcionó un token.');
    });

    it('debería devolver 401 si el token es inválido o malformado', async () => {
      const response = await request(app).get('/api/v1/staff').set('Authorization', 'Bearer tokeninvalido123');
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Token inválido o expirado.');
    });

    it('debería devolver 401 si el token corresponde a un usuario que no existe', async () => {
      const fakeToken = jwt.sign({ id: 9999 }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const response = await request(app).get('/api/v1/staff').set('Authorization', `Bearer ${fakeToken}`);
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Usuario no encontrado.');
    });
  });

  describe('Endpoints de Staff (/api/v1/staff)', () => {
    it('debería permitir el acceso y devolver la lista de personal si el token de admin es válido', async () => {
      const response = await request(app).get('/api/v1/staff').set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});