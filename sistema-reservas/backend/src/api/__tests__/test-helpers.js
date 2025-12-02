import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Genera un timestamp único para identificar datos de test
 */
export const generateTestId = () => Date.now().toString();

/**
 * Crea un usuario de test con datos únicos
 */
export const createTestUser = async (prisma, testId, role = 'administrator', overrides = {}) => {
  // Asegurar que existe el rol
  const userRole = await prisma.roles.upsert({
    where: { name: role },
    update: {},
    create: { 
      name: role,
      description: `${role} role for testing`
    }
  });

  const rut = `${testId.slice(-7).padStart(8, '0')}`;
  const rutDv = (parseInt(testId) % 10).toString();
  const userData = {
    identification_number: `${rut}-${rutDv}`,
    first_name: `Test`,
    paternal_last_name: `User`,
    email: `test.user.${testId}@test.com`,
    password_hash: await bcrypt.hash('testpassword123', 10),
    status: 'active',
    ...overrides
  };

  const user = await prisma.users.create({ data: userData });
  
  await prisma.user_roles.create({ 
    data: { 
      user_id: user.id, 
      role_id: userRole.id 
    } 
  });

  return { user, role: userRole };
};

/**
 * Limpia los datos de un test específico
 */
export const cleanupTestData = async (prisma, testId) => {
  try {
    // Eliminar relaciones primero
    await prisma.user_roles.deleteMany({
      where: {
        users: {
          email: { contains: testId }
        }
      }
    });

    // Eliminar usuarios
    await prisma.users.deleteMany({
      where: {
        OR: [
          { email: { contains: testId } },
          { email: { contains: 'test.user' } }
        ]
      }
    });

  } catch (error) {
  }
};

/**
 * Configuración de base de datos de prueba con aislamiento
 */
export class TestDatabase {
  constructor() {
    this.prisma = new PrismaClient();
    this.testId = generateTestId();
  }

  async setup() {
    await this.prisma.$connect();
    return this.testId;
  }

  async cleanup() {
    await cleanupTestData(this.prisma, this.testId);
    await this.prisma.$disconnect();
  }

  async createUser(role = 'administrator', overrides = {}) {
    return createTestUser(this.prisma, this.testId, role, overrides);
  }
}

/**
 * Espera un tiempo determinado (útil para tests que necesitan timing)
 */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));