import { logError } from '../utils/errorLogger.js';

/**
 * Middleware global para manejo de errores
 */
const errorHandler = async (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Error interno del servidor';

    // Determinar severidad basada en el status code
    let severity = 'medium';
    if (statusCode >= 500) severity = 'high';
    if (statusCode < 500) severity = 'low';

    // Registrar error en BD (solo si es 500 o explícitamente solicitado)
    // O si es un error no controlado
    if (statusCode >= 500 || err.logError) {
        try {
            await logError({
                userId: req.user ? req.user.id : null,
                userRole: req.user ? req.user.role : null, // Asumiendo que req.user tiene role
                description: message,
                originModule: 'GlobalErrorHandler',
                severity,
                errorObject: {
                    stack: err.stack,
                    path: req.path,
                    method: req.method,
                    body: req.body,
                    query: req.query,
                    params: req.params,
                },
            });
        } catch (loggingError) {
        }
    }

    // Log en consola siempre
    if (statusCode >= 500) {
    }

    res.status(statusCode).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

export default errorHandler;
