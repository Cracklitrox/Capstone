import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import redisClient from '../../db/redis.client';

const prisma = new PrismaClient();
let adminToken;
let consoleErrorSpy;

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
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  await resetDatabase();

  const adminRole = await prisma.roles.create({
    data: {
      name: 'administrator',
      description: 'Rol para pruebas de staff',
    },
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