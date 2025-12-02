import { getRecentErrors, resolveError } from '../../utils/errorLogger.js';

/**
 * Obtener errores del sistema con filtros
 */
async function getErrors(req, res) {
  try {
    const { severity, status, module, limit } = req.query;

    const filters = {};
    if (severity) filters.severity = severity;
    if (status) filters.status = status;
    if (module) filters.origin_module = module;

    const errorLimit = limit ? parseInt(limit) : 50;

    const errors = await getRecentErrors(errorLimit, filters);

    return res.status(200).json(errors);
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener logs",
      error: error.message,
    });
  }
}

/**
 * Marcar error como resuelto
 */
async function markErrorAsResolved(req, res) {
  try {
    const { id } = req.params;

    await resolveError(parseInt(id));

    return res.status(200).json({
      message: "Error marcado como resuelto",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al actualizar estado",
      error: error.message,
    });
  }
}

export default {
  getErrors,
  markErrorAsResolved,
};
