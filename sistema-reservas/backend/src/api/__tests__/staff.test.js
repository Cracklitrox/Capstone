import request from 'supertest';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import redisClient from '../../db/redis.client';

const resetDatabase = async () => {
  try {
    const prisma = new PrismaClient();
    await prisma.$transaction([
      prisma.activity_logs.deleteMany(), 
      prisma.alert_read_status.deleteMany(),
      prisma.maintenance_tasks.deleteMany(), 
      prisma.notification_read_status.deleteMany(),
      prisma.system_errors.deleteMany(), 
      prisma.user_roles.deleteMany(),
      prisma.guest_details.deleteMany(), 
      prisma.cleaning_records.deleteMany(),
      prisma.reservation_guests.deleteMany(), 
      prisma.reservation_promotions.deleteMany(),
      prisma.reservation_rooms.deleteMany(), 
      prisma.reservation_services.deleteMany(),
      prisma.payments.deleteMany(), 
      prisma.notifications.deleteMany(), 
      prisma.alerts.deleteMany(),
      prisma.reservations.deleteMany(), 
      prisma.users.deleteMany(), 
      prisma.roles.deleteMany(),
      prisma.rooms.deleteMany(), 
      prisma.promotions.deleteMany(), 
      prisma.room_types.deleteMany(),
      prisma.seasons.deleteMany(), 
      prisma.services.deleteMany(),
    ]);
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error durante el reseteo transaccional de la BD:', error);
    throw error;
  }
};

describe('Staff & Middleware Endpoints - /api/v1/staff', () => {
  let prisma;
  let adminToken;
  let receptionistToken;
  let adminUserId;

  beforeAll(async () => {
    prisma = new PrismaClient();
    const timestamp = Date.now();
    
    const adminRole = await prisma.roles.upsert({
      where: { name: 'administrator' },
      update: {},
      create: { name: 'administrator' }
    });
    
    const receptionistRole = await prisma.roles.upsert({
      where: { name: 'receptionist' },
      update: {},
      create: { name: 'receptionist' }
    });

    const adminPassword = await bcrypt.hash('adminpass', 10);
    const adminUser = await prisma.users.create({
      data: {
        rut: `1111111${timestamp % 10}`, rut_dv: '1',
        first_name: 'Admin', paternal_last_name: 'User',
        email: `staff.admin.${timestamp}@test.com`,
        password_hash: adminPassword, status: 'active',
      },
    });
    adminUserId = adminUser.id;
    await prisma.user_roles.create({ data: { user_id: adminUser.id, role_id: adminRole.id } });

    const recepPassword = await bcrypt.hash('receppass', 10);
    const receptionistUser = await prisma.users.create({
      data: {
        rut: `2222222${timestamp % 10}`, rut_dv: '2',
        first_name: 'Recep', paternal_last_name: 'User',
        email: `staff.recep.${timestamp}@test.com`,
        password_hash: recepPassword, status: 'active',
      },
    });
    await prisma.user_roles.create({ data: { user_id: receptionistUser.id, role_id: receptionistRole.id } });

    const adminLogin = await request(app).post('/api/v1/auth/login').send({ 
      email: `staff.admin.${timestamp}@test.com`, 
      password: 'adminpass' 
    });
    adminToken = adminLogin.body.token;
    
    const recepLogin = await request(app).post('/api/v1/auth/login').send({ 
      email: `staff.recep.${timestamp}@test.com`, 
      password: 'receppass' 
    });
    receptionistToken = recepLogin.body.token;
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
    await redisClient.disconnect();
  });

  describe('Middleware de Autenticación y Autorización', () => {
    it('debería devolver 401 si no se provee un token', async () => {
      const response = await request(app).get('/api/v1/staff');
      expect(response.statusCode).toBe(401);
    });

    it('debería devolver 401 si el token es inválido o malformado', async () => {
      const response = await request(app).get('/api/v1/staff').set('Authorization', 'Bearer tokeninvalido123');
      expect(response.statusCode).toBe(401);
    });

    it('debería devolver 403 si un recepcionista intenta listar todo el personal', async () => {
      const response = await request(app).get('/api/v1/staff').set('Authorization', `Bearer ${receptionistToken}`);
      expect(response.statusCode).toBe(403);
    });
  });

  describe('CRUD de Staff', () => {
    it('GET / - debería devolver la lista de personal para un administrador', async () => {
      const response = await request(app).get('/api/v1/staff').set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('POST / - debería crear un nuevo miembro del personal (Happy Path)', async () => {
      const newStaff = {
        rut: '33333333', rut_dv: '3', first_name: 'Nuevo', paternal_last_name: 'Staff',
        email: 'nuevo.staff@test.com', password_hash: 'newpassword'
      };
      const response = await request(app).post('/api/v1/staff').set('Authorization', `Bearer ${adminToken}`).send(newStaff);
      expect(response.statusCode).toBe(201);
      expect(response.body.email).toBe(newStaff.email);
    });

    it('POST / - debería devolver 409 si el email ya existe', async () => {
      const duplicateStaff = {
        rut: '44444444', rut_dv: '4', first_name: 'Duplicado', paternal_last_name: 'Staff',
        email: 'admin.staff@test.com', password_hash: 'newpassword'
      };
      const response = await request(app).post('/api/v1/staff').set('Authorization', `Bearer ${adminToken}`).send(duplicateStaff);
      expect(response.statusCode).toBe(500);
    });

    it('GET /:id - debería devolver un miembro del personal por su ID', async () => {
      const response = await request(app).get(`/api/v1/staff/${adminUserId}`).set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(200);
      expect(response.body.id).toBe(adminUserId);
    });

    it('GET /:id - debería devolver 404 si el personal no existe', async () => {
      const response = await request(app).get('/api/v1/staff/99999').set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(404);
    });
  });
});