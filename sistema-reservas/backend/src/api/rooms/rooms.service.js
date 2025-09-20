const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Obtiene todas las habitaciones, con filtros opcionales por estado y tipo de habitación.
 * @param {Object} filters - Filtros opcionales: status (estado), room_type_id (tipo de habitación)
 * @returns {Promise<Array>} Lista de habitaciones encontradas
 *
 * Ejemplo de uso:
 *   getRooms({ status: 'available', room_type_id: 2 })
 */
async function getRooms(filters = {}) {
  // Construye el objeto de filtros para la consulta
  const where = {};
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.room_type_id) {
    where.room_type_id = Number(filters.room_type_id);
  }
  // Consulta a la base de datos usando Prisma
  return prisma.rooms.findMany({
    where,
    include: {
      room_types: true, // Incluye información del tipo de habitación
    },
    orderBy: { id: 'asc' },
  });
}

// Exporta la función para ser usada en el controlador
module.exports = {
  getRooms,
};
