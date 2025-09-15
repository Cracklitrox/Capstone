import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import redisClient from '../../db/redis.client';

const prisma = new PrismaClient();
let adminToken;
let consoleErrorSpy;

// --- FUNCIÓN DE RESETEO EXHAUSTIVA ---
const resetDatabase = async () => {
  // Borramos todas las tablas que dependen de users o roles, en orden.
  // Usamos $transaction para ejecutar borrados independientes en paralelo.
  await prisma.$transaction([
    prisma.activity_logs.deleteMany({}),
    prisma.alert_read_status.deleteMany({}),
    prisma.cleaning_records.deleteMany({}),
    prisma.guest_details.deleteMany({}),
    prisma.maintenance_tasks.deleteMany({}),
    prisma.notification_read_status.deleteMany({}),
    prisma.payments.deleteMany({}),
    prisma.reservation_guests.deleteMany({}),
    prisma.reservation_promotions.deleteMany({}),
    prisma.reservation_rooms.deleteMany({}),
    prisma.reservation_services.deleteMany({}),
    prisma.system_errors.deleteMany({}),
    prisma.user_roles.deleteMany({}),
  ]);

  // Tablas que dependen de las anteriores
  await prisma.$transaction([
    prisma.alerts.deleteMany({}),
    prisma.notifications.deleteMany({}),
    prisma.reservations.deleteMany({}),
  ]);
  
  // Finalmente, las tablas maestras
  await prisma.$transaction([
    prisma.users.deleteMany({}),
    prisma.roles.deleteMany({}),
    prisma.promotions.deleteMany({}),
    prisma.rooms.deleteMany({}),
    prisma.services.deleteMany({}),
  ]);
  
  await prisma.room_types.deleteMany({});
};

beforeAll(async () => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  await resetDatabase();

  const adminRole = await prisma.roles.create({
    data: { name: 'administrator' },
  });

  const passwordHash = await bcrypt.hash('password123', 10);
  const adminUser = await prisma.users.create({
    data: {
      rut: '98765432',
      rut_dv: '1',
      first_name: 'Admin',
      paternal_last_name: 'StaffTest',
      email: 'admin.staff@test.com',
      password_hash: passwordHash,
    },
  });

  await prisma.user_roles.create({
    data: { user_id: adminUser.id, role_id: adminRole.id },
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
  await resetDatabase();
  await prisma.$disconnect();
  await redisClient.disconnect();
  if (consoleErrorSpy) {
    consoleErrorSpy.mockRestore();
  }
});

describe('Auth Middleware y Staff Endpoints', () => {
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

  it('debería permitir el acceso y devolver la lista de personal si el token de admin es válido', async () => {
    const response = await request(app).get('/api/v1/staff').set('Authorization', `Bearer ${adminToken}`);
    expect(response.statusCode).toBe(200);
  });
});