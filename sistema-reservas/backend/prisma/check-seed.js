const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndSeed() {
  const userCount = await prisma.users.count();

  if (userCount === 0) {
    console.log("La base de datos está vacía. Ejecutando el script de seed...");
    await prisma.$executeRaw('CALL runSeedScript()');
  } else {
    console.log(`La base de datos ya tiene datos (${userCount} usuarios). Omitiendo el seed.`);
  }

  await prisma.$disconnect();
}

checkAndSeed().catch(e => {
  console.error(e);
  process.exit(1);
});
