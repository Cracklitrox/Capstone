const { PrismaClient } = require('@prisma/client');
const { main: runSeed } = require('./seed.js'); 

const prisma = new PrismaClient();

async function checkAndSeed() {
  // Retry logic para asegurar conexión estable
  let retries = 5;
  let connected = false;
  
  while (retries > 0 && !connected) {
    try {
      await prisma.$connect();
      connected = true;
      console.log('✅ Conexión a base de datos establecida.');
    } catch (error) {
      retries--;
      console.log(`⏳ Esperando conexión estable a la base de datos... (intentos restantes: ${retries})`);
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        throw error;
      }
    }
  }

  const userCount = await prisma.users.count();

  if (userCount === 0) {
    console.log("La base de datos está vacía. Ejecutando el script de seed...");
    await runSeed();
  } else {
    console.log(`La base de datos ya tiene datos (${userCount} usuarios). Omitiendo el seed.`);
  }
}

checkAndSeed()
  .catch(async (e) => {
    console.error('❌ Error durante el check-and-seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });