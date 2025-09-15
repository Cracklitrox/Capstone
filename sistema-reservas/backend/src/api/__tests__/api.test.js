import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import redisClient from '../../db/redis.client';

const prisma = new PrismaClient();

// Función de limpieza única para todo el archivo
const resetDatabase = async () => {
  try {
    await prisma.$transaction([
      prisma.activity_logs.deleteMany(), prisma.alert_read_status.deleteMany(),
      prisma.maintenance_tasks.deleteMany(), prisma.notification_read_status.deleteMany(),
      prisma.system_errors.deleteMany(), prisma.user_roles.deleteMany(),
      prisma.guest_details.deleteMany(), prisma.cleaning_records.deleteMany(),
      prisma.reservation_guests.deleteMany(), prisma.reservation_promotions.deleteMany(),
      prisma.reservation_rooms.deleteMany(), prisma.reservation_services.deleteMany(),
      prisma.payments.deleteMany(), prisma.notifications.deleteMany(), prisma.alerts.deleteMany(),
      prisma.reservations.deleteMany(), prisma.users.deleteMany(), prisma.roles.deleteMany(),
      prisma.rooms.deleteMany(), prisma.promotions.deleteMany(), prisma.room_types.deleteMany(),
      prisma.seasons.deleteMany(), prisma.services.deleteMany(),
    ]);
  } catch (error) {
    console.error('Error durante el reseteo transaccional de la BD:', error);
    throw error;
  }
};

// ==========================================================================================
// SUITE DE PRUEBAS PARA AUTENTICACIÓN (antes en auth.test.js)
// ==========================================================================================
describe('Auth Endpoints', () => {
  beforeAll(async () => {
    await resetDatabase();

    const testRole = await prisma.roles.create({ data: { name: 'administrator' } });
    const passwordHash = await bcrypt.hash('ReservasDevPass_2025', 10);
    const testUser = await prisma.users.create({
      data: {
        rut: '12345678', rut_dv: '9', first_name: 'Test', paternal_last_name: 'User',
        email: 'test@example.com', password_hash: passwordHash, status: 'active',
      },
    });
    await prisma.user_roles.create({ data: { user_id: testUser.id, role_id: testRole.id } });
  });

  afterAll(async () => {
    await resetDatabase();
  });

  it('POST /api/v1/auth/login - Debería retornar un token con credenciales válidas', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'ReservasDevPass_2025' });
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token');
  });

  it('POST /api/v1/auth/login - Debería retornar un error 401 con credenciales inválidas', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' });
    expect(response.statusCode).toBe(401);
  });
});

// ==========================================================================================
// SUITE DE PRUEBAS PARA STAFF (antes en staff.test.js)
// ==========================================================================================
describe('Staff & Middleware Endpoints', () => {
  let adminToken;

  beforeAll(async () => {
    await resetDatabase();

    const adminRole = await prisma.roles.create({ data: { name: 'administrator' } });
    const passwordHash = await bcrypt.hash('password123', 10);
    const adminUser = await prisma.users.create({
      data: {
        rut: '98765432', rut_dv: '1', first_name: 'Admin', paternal_last_name: 'StaffTest',
        email: 'admin.staff@test.com', password_hash: passwordHash, status: 'active',
      },
    });
    await prisma.user_roles.create({ data: { user_id: adminUser.id, role_id: adminRole.id } });
    
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin.staff@test.com', password: 'password123' });
    adminToken = response.body.token;
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
    await redisClient.disconnect();
  });

  it('debería devolver 401 si no se provee el header de Authorization', async () => {
    const response = await request(app).get('/api/v1/staff');
    expect(response.statusCode).toBe(401);
  });

  it('debería devolver 401 si el token es inválido', async () => {
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