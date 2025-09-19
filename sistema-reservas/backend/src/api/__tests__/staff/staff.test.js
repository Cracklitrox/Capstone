import request from 'supertest';
import app from '../../../app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import redisClient from '../../../db/redis.client';

describe('Staff & Middleware Endpoints - /api/v1/staff', () => {
  let prisma;
  let adminToken;
  let receptionistToken;
  let adminUser;
  let receptionistUser;
  let testId;
  let createdUserId;

  beforeAll(async () => {
    prisma = new PrismaClient();
    testId = Date.now().toString();
    
    // Limpiar datos previos
    await prisma.user_roles.deleteMany({
      where: {
        users: {
          email: { contains: testId }
        }
      }
    });
    await prisma.users.deleteMany({
      where: { 
        OR: [
          { email: { contains: testId } },
          { email: { contains: 'staff.admin' } },
          { email: { contains: 'staff.recep' } }
        ]
      }
    });
    
    // Crear roles
    const adminRole = await prisma.roles.upsert({
      where: { name: 'administrator' },
      update: {},
      create: { name: 'administrator', description: 'Administrator role' }
    });
    
    const receptionistRole = await prisma.roles.upsert({
      where: { name: 'receptionist' },
      update: {},
      create: { name: 'receptionist', description: 'Receptionist role' }
    });

    // Crear usuarios
    const adminPassword = await bcrypt.hash('adminpass', 10);
    adminUser = await prisma.users.create({
      data: {
        rut: `${testId.slice(-7).padStart(8, '1')}`,
        rut_dv: '1',
        first_name: 'Admin',
        paternal_last_name: 'User',
        email: `staff.admin.${testId}@test.com`,
        password_hash: adminPassword,
        status: 'active',
      },
    });
    
    await prisma.user_roles.create({ 
      data: { user_id: adminUser.id, role_id: adminRole.id } 
    });

    const recepPassword = await bcrypt.hash('receppass', 10);
    receptionistUser = await prisma.users.create({
      data: {
        rut: `${testId.slice(-7).padStart(8, '2')}`,
        rut_dv: '2',
        first_name: 'Recep',
        paternal_last_name: 'User',
        email: `staff.recep.${testId}@test.com`,
        password_hash: recepPassword,
        status: 'active',
      },
    });
    
    await prisma.user_roles.create({ 
      data: { user_id: receptionistUser.id, role_id: receptionistRole.id } 
    });

    // Obtener tokens
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: adminUser.email, password: 'adminpass' });
    adminToken = adminLogin.body.token;
    
    const recepLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: receptionistUser.email, password: 'receppass' });
    receptionistToken = recepLogin.body.token;
  });

  afterAll(async () => {
    // Limpiar usuarios creados
    if (createdUserId) {
      await prisma.users.delete({ where: { id: createdUserId } }).catch(() => {});
    }
    
    if (adminUser?.id) {
      await prisma.user_roles.deleteMany({ where: { user_id: adminUser.id } });
      await prisma.users.delete({ where: { id: adminUser.id } }).catch(() => {});
    }
    
    if (receptionistUser?.id) {
      await prisma.user_roles.deleteMany({ where: { user_id: receptionistUser.id } });
      await prisma.users.delete({ where: { id: receptionistUser.id } }).catch(() => {});
    }

    await prisma.users.deleteMany({
      where: { 
        OR: [
          { email: { contains: testId } },
          { email: 'nuevo.staff@test.com' },
          { email: 'existing.staff@test.com' }
        ]
      }
    });

    await prisma.$disconnect();
    await redisClient.disconnect();
  });

  describe('Middleware de Autenticación y Autorización', () => {
    it('debería devolver 401 si no se provee un token', async () => {
      const response = await request(app).get('/api/v1/staff');
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Acceso denegado. No se proporcionó un token.');
    });

    it('debería devolver 401 si el token es inválido o malformado', async () => {
      const response = await request(app)
        .get('/api/v1/staff')
        .set('Authorization', 'Bearer tokeninvalido123');
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Token inválido o expirado.');
    });

    it('debería devolver 403 si un recepcionista intenta listar todo el personal', async () => {
      const response = await request(app)
        .get('/api/v1/staff')
        .set('Authorization', `Bearer ${receptionistToken}`);
      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe('Acceso prohibido. No tienes los permisos necesarios.');
    });
  });

  describe('CRUD de Staff', () => {
    it('GET / - debería devolver la lista de personal para un administrador', async () => {
      const response = await request(app)
        .get('/api/v1/staff')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('POST / - debería crear un nuevo miembro del personal (Happy Path)', async () => {
      const uniqueId = Date.now() + 100;
      const newStaff = {
        rut: `${uniqueId.toString().slice(-8)}`,
        rut_dv: '3',
        first_name: 'Nuevo',
        paternal_last_name: 'Staff',
        email: `nuevo.staff.${uniqueId}@test.com`,
        password_hash: 'newpassword'
      };
      
      const response = await request(app)
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newStaff);
      
      expect(response.statusCode).toBe(201);
      expect(response.body.email).toBe(newStaff.email);
      expect(response.body.id).toBeDefined();
      
      // Guardar ID para limpieza posterior
      createdUserId = response.body.id;
    });

    it('POST / - debería devolver 409 si el email ya existe', async () => {
      const uniqueId = Date.now() + 200;
      
      // Crear usuario existente
      await prisma.users.create({
        data: {
          rut: `${uniqueId.toString().slice(-8)}`,
          rut_dv: '5',
          first_name: 'Existing',
          paternal_last_name: 'User',
          email: `existing.staff.${uniqueId}@test.com`,
          password_hash: await bcrypt.hash('password', 10),
          status: 'active'
        }
      });

      // Intentar crear duplicado
      const duplicateStaff = {
        rut: `${(uniqueId + 1).toString().slice(-8)}`,
        rut_dv: '4',
        first_name: 'Duplicado',
        paternal_last_name: 'Staff',
        email: `existing.staff.${uniqueId}@test.com`,
        password_hash: 'newpassword'
      };
      
      const response = await request(app)
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateStaff);
      
      expect(response.statusCode).toBe(409);
      expect(response.body.code).toBe('DUPLICATE_EMAIL');
    });

    it('POST / - debería devolver 409 si el RUT ya existe', async () => {
      const uniqueId = Date.now() + 300;
      const existingRut = `${uniqueId.toString().slice(-8)}`;
      
      // Crear usuario con RUT existente
      await prisma.users.create({
        data: {
          rut: existingRut,
          rut_dv: '6',
          first_name: 'Existing',
          paternal_last_name: 'RUT',
          email: `existing.rut.${uniqueId}@test.com`,
          password_hash: await bcrypt.hash('password', 10),
          status: 'active'
        }
      });

      // Intentar crear con RUT duplicado
      const duplicateRutStaff = {
        rut: existingRut, // RUT duplicado
        rut_dv: '6',
        first_name: 'Duplicado',
        paternal_last_name: 'RUT',
        email: `new.email.${uniqueId}@test.com`,
        password_hash: 'newpassword'
      };
      
      const response = await request(app)
        .post('/api/v1/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateRutStaff);
      
      expect(response.statusCode).toBe(409);
      expect(response.body.code).toBe('DUPLICATE_RUT');
    });

    it('GET /:id - debería devolver un miembro del personal por su ID', async () => {
      const response = await request(app)
        .get(`/api/v1/staff/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.statusCode).toBe(200);
      expect(response.body.id).toBe(adminUser.id);
      expect(response.body).toHaveProperty('user_roles');
    });

    it('GET /:id - debería devolver 404 si el personal no existe', async () => {
      const response = await request(app)
        .get('/api/v1/staff/99999')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe('Usuario no encontrado.');
    });

    it('GET /:id - debería devolver 400 con ID inválido', async () => {
      const response = await request(app)
        .get('/api/v1/staff/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe('El ID debe ser un número válido.');
    });

    it('PUT /:id - debería actualizar un miembro del personal', async () => {
      // Crear un usuario para actualizar
      const uniqueId = Date.now() + 400;
      const userToUpdate = await prisma.users.create({
        data: {
          rut: `${uniqueId.toString().slice(-8)}`,
          rut_dv: '7',
          first_name: 'Para',
          paternal_last_name: 'Actualizar',
          email: `para.actualizar.${uniqueId}@test.com`,
          password_hash: await bcrypt.hash('password', 10),
          status: 'active'
        }
      });

      const updateData = {
        first_name: 'Actualizado',
        paternal_last_name: 'Usuario',
        status: 'inactive'
      };

      const response = await request(app)
        .put(`/api/v1/staff/${userToUpdate.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.statusCode).toBe(200);
      expect(response.body.first_name).toBe('Actualizado');
      expect(response.body.paternal_last_name).toBe('Usuario');
      expect(response.body.status).toBe('inactive');

      // Limpiar
      await prisma.users.delete({ where: { id: userToUpdate.id } });
    });

    it('PUT /:id - debería devolver 404 si el usuario no existe', async () => {
      const updateData = {
        first_name: 'No',
        paternal_last_name: 'Existe'
      };

      const response = await request(app)
        .put('/api/v1/staff/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.statusCode).toBe(404);
      expect(response.body.code).toBe('USER_NOT_FOUND');
    });

    it('PUT /:id - debería devolver 400 con ID inválido', async () => {
      const response = await request(app)
        .put('/api/v1/staff/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ first_name: 'Test' });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe('El ID debe ser un número válido.');
    });

    it('PUT /:id - debería devolver 409 si se intenta usar email duplicado', async () => {
      const uniqueId = Date.now() + 500;
      
      // Crear dos usuarios
      const user1 = await prisma.users.create({
        data: {
          rut: `${uniqueId.toString().slice(-8)}`,
          rut_dv: '8',
          first_name: 'Usuario',
          paternal_last_name: 'Uno',
          email: `usuario.uno.${uniqueId}@test.com`,
          password_hash: await bcrypt.hash('password', 10),
          status: 'active'
        }
      });

      const user2 = await prisma.users.create({
        data: {
          rut: `${(uniqueId + 1).toString().slice(-8)}`,
          rut_dv: '9',
          first_name: 'Usuario',
          paternal_last_name: 'Dos',
          email: `usuario.dos.${uniqueId}@test.com`,
          password_hash: await bcrypt.hash('password', 10),
          status: 'active'
        }
      });

      // Intentar actualizar user2 con el email de user1
      const response = await request(app)
        .put(`/api/v1/staff/${user2.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: user1.email });

      expect(response.statusCode).toBe(409);
      expect(response.body.code).toBe('DUPLICATE_EMAIL');

      // Limpiar
      await prisma.users.deleteMany({
        where: { id: { in: [user1.id, user2.id] } }
      });
    });
  });
});