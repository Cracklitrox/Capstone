const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkAndSeed() {
  const userCount = await prisma.users.count();

  if (userCount === 0) {
    console.log("La base de datos está vacía. Ejecutando el script de seed...");

    const { main: runSeed } = require("./seed.js");
    await runSeed();
  } else {
    console.log(
      `La base de datos ya tiene datos (${userCount} usuarios). Omitiendo el seed.`
    );
  }
}

checkAndSeed()
  .catch(async (e) => {
    console.error("❌ Error durante el check-and-seed:", e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
