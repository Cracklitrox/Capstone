// backend/src/api/__tests__/auth.test.js

const request = require('supertest');
const app = require('../../app');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const redisClient = require('../../db/redis.client');

const prisma = new PrismaClient();

let consoleErrorSpy;
beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  consoleErrorSpy.mockRestore();
});


beforeAll(async () => {
  await prisma.activity_logs.deleteMany({});
  await prisma.alert_read_status.deleteMany({});
  await prisma.alerts.deleteMany({});
  await prisma.cleaning_records.deleteMany({});
  await prisma.guest_details.deleteMany({});
  await prisma.maintenance_tasks.deleteMany({});
  await prisma.notification_read_status.deleteMany({});
  await prisma.notifications.deleteMany({});
  await prisma.payments.deleteMany({});
  await prisma.reservation_guests.deleteMany({});
  await prisma.reservation_promotions.deleteMany({});
  await prisma.reservation_rooms.deleteMany({});
  await prisma.reservation_services.deleteMany({});
  await prisma.reservations.deleteMany({});
  await prisma.system_errors.deleteMany({});
  await prisma.user_roles.deleteMany({});
  await prisma.users.deleteMany({});


  const passwordHash = await bcrypt.hash('p4ssw0rd_s3gUr4_2025!', 10);
  await prisma.users.create({
    data: {
      rut: '12345678',
      rut_dv: '9',
      first_name: 'Test',
      paternal_last_name: 'User',
      email: 'test@example.com',
      password_hash: passwordHash,
      status: 'active',
    },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  await redisClient.quit();
});

describe('Auth Endpoints - /api/v1/auth', () => {
  
  it('POST /login - Debería retornar un token con credenciales válidas', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'p4ssw0rd_s3gUr4_2025!',
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('user');
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
    expect(response.body.message).toBe('Credenciales inválidas');
  });
});