const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Obtiene todas las habitaciones de la base de datos.
 * @returns {Promise<Array>} Lista de habitaciones
 */
async function getAllRooms() {
  return prisma.rooms.findMany({
    orderBy: { id: 'asc' },
  });
}

module.exports = {
  getAllRooms,
};
