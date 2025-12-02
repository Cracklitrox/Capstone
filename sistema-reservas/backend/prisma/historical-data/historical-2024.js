import { PrismaClient } from '@prisma/client';
import { generateYearlyData } from './generator.js';

const prisma = new PrismaClient();

async function main() {
    try {
        // 2024: Año actual/reciente (ej: 300)
        await generateYearlyData(prisma, 2024, 300);
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { main as generate2024 };
