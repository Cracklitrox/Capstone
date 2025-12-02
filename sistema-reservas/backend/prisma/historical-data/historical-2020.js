import { PrismaClient } from '@prisma/client';
import { generateYearlyData } from './generator.js';

const prisma = new PrismaClient();

async function main() {
    try {
        // 2020: Año de pandemia, menos reservas (ej: 150)
        await generateYearlyData(prisma, 2020, 150);
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { main as generate2020 };
