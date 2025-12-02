import { PrismaClient } from '@prisma/client';
import { generateYearlyData } from './generator.js';

const prisma = new PrismaClient();

async function main() {
    try {
        // 2021: Recuperación lenta (ej: 200)
        await generateYearlyData(prisma, 2021, 200);
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { main as generate2021 };
