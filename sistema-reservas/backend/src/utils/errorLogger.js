const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Registrar error en la base de datos
 */
async function logError({
  userId = null,
  userRole = null,
  description,
  originModule,
  severity = "medium",
  errorObject = null,
}) {
  try {
    // Extraer información adicional del error si existe
    let errorDetails = description;

    if (errorObject) {
      errorDetails = {
        message: errorObject.message,
        stack: errorObject.stack,
        name: errorObject.name,
        ...errorObject,
      };
    }

    await prisma.system_errors.create({
      data: {
        user_id: userId,
        user_role: userRole,
        description:
          typeof errorDetails === "object"
            ? JSON.stringify(errorDetails)
            : errorDetails,
        origin_module: originModule,
        severity,
        status: "pending",
      },
    });

    // Log en consola también
    console.error(`[${severity.toUpperCase()}] ${originModule}:`, description);
    if (errorObject) {
      console.error(errorObject);
    }
  } catch (error) {
    // Si falla el log en BD, al menos registrar en consola
    console.error("Error al registrar en BD:", error);
    console.error("Error original:", description);
  }
}

/**
 * Obtener errores recientes
 */
async function getRecentErrors(limit = 50, filters = {}) {
  const { severity, status, module } = filters;

  const where = {};
  if (severity) where.severity = severity;
  if (status) where.status = status;
  if (module) where.origin_module = module;

  return await prisma.system_errors.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take: limit,
    include: {
      users: {
        select: {
          first_name: true,
          paternal_last_name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Marcar error como resuelto
 */
async function resolveError(errorId) {
  return await prisma.system_errors.update({
    where: { id: errorId },
    data: { status: "resolved" },
  });
}

module.exports = {
  logError,
  getRecentErrors,
  resolveError,
};
