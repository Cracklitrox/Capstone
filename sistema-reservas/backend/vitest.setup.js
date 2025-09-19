import { beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

let prisma;

beforeAll(async () => {
  // Inicializar cliente de Prisma para tests
  prisma = new PrismaClient();
  
  // Verificar conexión a la base de datos
  await prisma.$connect();
  
  console.log('🔗 Conexión a base de datos de prueba establecida');
});

afterAll(async () => {
  // Limpiar y cerrar conexión
  if (prisma) {
    await prisma.$disconnect();
    console.log('🔌 Conexión a base de datos de prueba cerrada');
  }
});

// Función utilitaria para limpiar datos específicos de tests
global.cleanupTestData = async (testIdentifier) => {
  if (prisma && testIdentifier) {
    try {
      // Limpiar datos que contengan el identificador de test
      await prisma.user_roles.deleteMany({
        where: {
          users: {
            email: {
              contains: testIdentifier
            }
          }
        }
      });
      
      await prisma.users.deleteMany({
        where: {
          email: {
            contains: testIdentifier
          }
        }
      });
      
      console.log(`🧹 Datos de test limpiados: ${testIdentifier}`);
    } catch (error) {
      console.warn(`⚠️  Error al limpiar datos de test: ${error.message}`);
    }
  }
};