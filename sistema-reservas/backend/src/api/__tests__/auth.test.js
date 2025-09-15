import request from 'supertest';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import redisClient from '../../db/redis.client';

const prisma = new PrismaClient();
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

  const testRole = await prisma.roles.create({
    data: { name: 'administrator' },
  });

  const passwordHash = await bcrypt.hash('ReservasDevPass_2025', 10);
  const testUser = await prisma.users.create({
    data: {
      rut: '12345678',
      rut_dv: '9',
      first_name: 'Test',
      paternal_last_name: 'User',
      email: 'test@example.com',
      password_hash: passwordHash,
    },
  });

  await prisma.user_roles.create({
    data: { user_id: testUser.id, role_id: testRole.id },
  });
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
  await redisClient.disconnect();
  if (consoleErrorSpy) {
    consoleErrorSpy.mockRestore();
  }
});

describe('Auth Endpoints - /api/v1/auth', () => {
  it('POST /login - Debería retornar un token con credenciales válidas', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'ReservasDevPass_2025',
      });
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token');
  });

  it('POST /login - Debería retornar un error 401 con credenciales inválidas', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword',
      });
    expect(response.statusCode).toBe(401);
  });
});