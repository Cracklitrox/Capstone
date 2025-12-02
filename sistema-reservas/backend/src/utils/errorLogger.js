import prisma from '../db/prisma.client.js';

/**
 * Registrar error en la base de datos
 */
export async function logError({
  userId = null,
  userRole = null,
  description,
  originModule,
  severity = "medium",
  errorObject = null,
}) {
  try {
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
        origin_module: originModule.substring(0, 40),
        severity,
        status: "pending",
      },
    });

    if (errorObject) {
    }
  } catch (error) {
  }
}

/**
 * Obtener errores recientes
 */
export async function getRecentErrors(limit = 50, filters = {}) {
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
export async function resolveError(errorId) {
  return await prisma.system_errors.update({
    where: { id: errorId },
    data: { status: "resolved" },
  });
}
