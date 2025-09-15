import request from 'supertest';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import redisClient from '../../db/redis.client';

const prisma = new PrismaClient();

const resetDatabase = async () => {
  // Primero, eliminamos los registros de las tablas que tienen múltiples dependencias (join tables)
  await prisma.reservation_guests.deleteMany({});
  await prisma.reservation_promotions.deleteMany({});
  await prisma.reservation_rooms.deleteMany({});
  await prisma.reservation_services.deleteMany({});
  await prisma.alert_read_status.deleteMany({});
  await prisma.notification_read_status.deleteMany({});
  await prisma.user_roles.deleteMany({});

  // Luego, tablas que dependen de otras pero son "padres" de las anteriores
  await prisma.payments.deleteMany({});
  await prisma.maintenance_tasks.deleteMany({});
  await prisma.cleaning_records.deleteMany({});
  await prisma.alerts.deleteMany({});
  await prisma.notifications.deleteMany({});
  
  // Tablas que dependen principalmente de 'users'
  await prisma.activity_logs.deleteMany({});
  await prisma.guest_details.deleteMany({});
  await prisma.system_errors.deleteMany({});

  // Ahora podemos eliminar las reservaciones, ya que sus dependencias fueron eliminadas
  await prisma.reservations.deleteMany({});
  
  // Y ahora los usuarios y roles, que son dependencias de muchas tablas ya limpias
  await prisma.users.deleteMany({});
  await prisma.roles.deleteMany({});

  // Finalmente, tablas que no tienen muchas dependencias entrantes
  await prisma.rooms.deleteMany({});
  await prisma.room_types.deleteMany({});
  await prisma.services.deleteMany({});
  await prisma.promotions.deleteMany({});
  await prisma.seasons.deleteMany({});
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