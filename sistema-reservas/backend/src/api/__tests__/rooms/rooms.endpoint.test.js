
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import request from 'supertest';
import app from '../../../app.js';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
let prisma;
let redisClient;

beforeAll(async () => {
  prisma = (await import('../../../db/prisma.client.js')).default || (await import('../../../db/prisma.client.js'));
  redisClient = (await import('../../../db/redis.client.js')).default || (await import('../../../db/redis.client.js'));
});

beforeEach(async () => {
  // Limpiar dependencias y poblar con datos de prueba
  await prisma.reservation_rooms.deleteMany();
  await prisma.rooms.deleteMany();
  await prisma.room_types.deleteMany();
  await prisma.room_types.create({
    data: {
      id: 1,
      name: 'TestType',
      base_capacity: 2,
      description: 'Tipo de prueba',
      is_active: true,
    },
  });
  await prisma.rooms.createMany({
    data: [
      {
        id: 1,
        room_number: '101',
        status: 'available',
        floor: 1,
        room_type_id: 1,
        capacity: 1,
        base_price: 10000,
      },
      {
        id: 2,
        room_number: '102',
        status: 'occupied',
        floor: 1,
        room_type_id: 1,
        capacity: 2,
        base_price: 15000,
      },
    ],
    skipDuplicates: true,
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  await redisClient.quit();
});

describe('Rooms API endpoints', () => {
  it('GET /api/v1/rooms debe retornar lista de habitaciones', async () => {
    const res = await request(app).get('/api/v1/rooms');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    for (const room of res.body) {
      expect(room).toHaveProperty('id');
  expect(room).toHaveProperty('number');
      expect(room).toHaveProperty('status');
      expect(room).toHaveProperty('type');
      expect(room).toHaveProperty('floor');
    }
  });

  it('GET /api/v1/rooms/:id debe retornar detalles de una habitación existente', async () => {
    const resDetail = await request(app).get('/api/v1/rooms/1');
    expect(resDetail.statusCode).toBe(200);
    expect(resDetail.body).toHaveProperty('id', 1);
  expect(resDetail.body).toHaveProperty('room_number', '101');
  expect(resDetail.body).toHaveProperty('status', 'available');
  // Si el endpoint retorna 'type', valida aquí. Si no, omite esta línea.
  expect(resDetail.body).toHaveProperty('floor', 1);
  });

  it('GET /api/v1/rooms/:id debe retornar 404 si la habitación no existe', async () => {
    const resDetail = await request(app).get('/api/v1/rooms/999');
    expect(resDetail.statusCode).toBe(404);
  expect(resDetail.body).toHaveProperty('message');
  });
});
