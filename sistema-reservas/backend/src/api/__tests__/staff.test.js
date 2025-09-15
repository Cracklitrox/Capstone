import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import redisClient from '../../db/redis.client';

const prisma = new PrismaClient();

let adminUser;
let adminToken;
let consoleErrorSpy;


beforeAll(async () => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  const adminRole = await prisma.roles.upsert({
    where: { name: 'administrator' },
    update: {},
    create: {
      name: 'administrator',
      description: 'Rol de administrador para pruebas de staff',
    },
  });

  const passwordHash = await bcrypt.hash('password123', 10);
  adminUser = await prisma.users.create({
    data: {
      rut: '98765432',
      rut_dv: '1',
      first_name: 'Admin',
      paternal_last_name: 'StaffTest',
      email: 'admin.staff@test.com',
      password_hash: passwordHash,
      status: 'active',
    },
  });

  await prisma.user_roles.create({
    data: {
      user_id: adminUser.id,
      role_id: adminRole.id,
    },
  });

  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'admin.staff@test.com',
      password: 'password123',
    });
  adminToken = response.body.token;
});

afterAll(async () => {
  await prisma.user_roles.deleteMany({});
  await prisma.users.deleteMany({});
  await prisma.roles.deleteMany({});

  await prisma.$disconnect();
  await redisClient.disconnect();

  consoleErrorSpy.mockRestore();
});



describe('Auth Middleware y Staff Endpoints', () => {

  describe('Middleware de Autenticación', () => {
    it('debería devolver 401 si no se provee el header de Authorization', async () => {
      const response = await request(app).get('/api/v1/staff');
      expect(response.statusCode).toBe(401);
    });

    it('debería devolver 401 si el token es inválido o malformado', async () => {
      const response = await request(app).get('/api/v1/staff').set('Authorization', 'Bearer tokeninvalido123');
      expect(response.statusCode).toBe(401);
    });

    it('debería devolver 401 si el token corresponde a un usuario que no existe', async () => {
      const fakeToken = jwt.sign({ id: 999999 }, process.env.JWT_SECRET, { expiresIn: '1h' });
      const response = await request(app).get('/api/v1/staff').set('Authorization', `Bearer ${fakeToken}`);
      expect(response.statusCode).toBe(401);
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