import { PrismaClient } from '@prisma/client';
import { generateYearlyData } from './generator.js';

const prisma = new PrismaClient();

async function runAll() {
    try {
        console.log("🚀 Iniciando carga masiva de datos históricos (2020-2024)...");

        // Ejecutar secuencialmente para no saturar la conexión
        await generateYearlyData(prisma, 2020, 150);
        await generateYearlyData(prisma, 2021, 200);
        await generateYearlyData(prisma, 2022, 250);
        await generateYearlyData(prisma, 2023, 280);
        await generateYearlyData(prisma, 2024, 300);

        console.log("\n✅ Carga masiva completada exitosamente.");

        // Verificación final
        const count = await prisma.reservations.count({
            where: { status: 'completed' }
        });
        console.log(`📊 Total de reservas completadas en el sistema: ${count}`);

    } catch (error) {
        console.error("❌ Error en la carga masiva:", error);
    } finally {
        await prisma.$disconnect();
    }
}

runAll();
