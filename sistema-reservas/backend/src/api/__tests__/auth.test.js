import request from 'supertest';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import redisClient from '../../db/redis.client';

const prisma = new PrismaClient();

// SOLUCIÓN DEFINITIVA: Limpiar la BD con un comando SQL directo y robusto.
const resetDatabase = async () => {
  // Obtenemos todos los nombres de las tablas del schema de Prisma
  const tableNames = Object.keys(prisma).filter(
    (key) => !key.startsWith('_') && !key.startsWith('$')
  );

  // Creamos un comando SQL para truncar todas las tablas
  const truncateQuery = `TRUNCATE TABLE ${tableNames
    .map((name) => `"${name}"`)
    .join(', ')} RESTART IDENTITY CASCADE;`;

  try {
    // Usamos $executeRawUnsafe para ejecutar el comando de limpieza
    await prisma.$executeRawUnsafe(truncateQuery);
  } catch (error) {
    console.error('Error al truncar la base de datos:', error);
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