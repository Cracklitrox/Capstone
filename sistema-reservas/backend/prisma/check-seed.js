const { PrismaClient } = require('@prisma/client');
const { main: runSeed } = require('./seed.js'); 

const prisma = new PrismaClient();

async function checkAndSeed() {
  const userCount = await prisma.users.count();

  if (userCount === 0) {
    console.log("La base de datos está vacía. Ejecutando el script de seed...");
    await runSeed();
  } else {
    console.log(`La base de datos ya tiene datos (${userCount} usuarios). Omitiendo el seed.`);
  }
}

checkAndSeed()
  .catch(e => {
    console.error('❌ Error durante el check-and-seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });