import { PrismaClient } from '@prisma/client';
import { generateYearlyData } from './generator.js';

const prisma = new PrismaClient();

async function main() {
    try {
        // 2023: Crecimiento (ej: 280)
        await generateYearlyData(prisma, 2023, 280);
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { main as generate2023 };
