import request from 'supertest';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import redisClient from '../../db/redis.client';

const prisma = new PrismaClient();

const resetDatabase = async () => {
  try {
    await prisma.$transaction([
      // Empezamos por las tablas que tienen muchas dependencias de otras
      prisma.activity_logs.deleteMany(),
      prisma.alert_read_status.deleteMany(),
      prisma.maintenance_tasks.deleteMany(),
      prisma.notification_read_status.deleteMany(),
      prisma.system_errors.deleteMany(),
      prisma.user_roles.deleteMany(),
      prisma.guest_details.deleteMany(),
      prisma.cleaning_records.deleteMany(),
      
      // Tablas de "unión" de reservaciones
      prisma.reservation_guests.deleteMany(),
      prisma.reservation_promotions.deleteMany(),
      prisma.reservation_rooms.deleteMany(),
      prisma.reservation_services.deleteMany(),

      // Tablas que dependen de reservaciones
      prisma.payments.deleteMany(),
      
      // Tablas que dependen de otras principales
      prisma.notifications.deleteMany(),
      prisma.alerts.deleteMany(),

      // Ahora las tablas "padre" principales
      prisma.reservations.deleteMany(),
      prisma.users.deleteMany(),
      prisma.roles.deleteMany(),
      prisma.rooms.deleteMany(),
      
      // Y finalmente las tablas con menos dependencias entrantes
      prisma.promotions.deleteMany(),
      prisma.room_types.deleteMany(),
      prisma.seasons.deleteMany(),
      prisma.services.deleteMany(),
    ]);
  } catch (error) {
    console.error('Error durante el reseteo transaccional de la BD:', error);
    throw error;
  }
};

beforeAll(async () => {
  await resetDatabase();

  const testRole = await prisma.roles.create({
    data: {
      name: 'administrator',
      description: 'Rol de prueba para administradores',
    },
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
      status: 'active',
    },
  });

  await prisma.user_roles.create({
    data: {
      user_id: testUser.id,
      role_id: testRole.id,
    },
  });
});

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
  await redisClient.disconnect();
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
  });
});