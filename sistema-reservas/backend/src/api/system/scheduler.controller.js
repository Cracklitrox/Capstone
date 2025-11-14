/**
 * Scheduler Controller
 *
 * Endpoints para administrar y monitorear el scheduler BullMQ.
 * Solo accesible para administradores.
 */

const { triggerManualJob, getSchedulersInfo } = require('../../scheduler');

/**
 * Ejecutar manualmente un job específico
 * POST /api/v1/system/scheduler/trigger
 * Body: { jobType: 'ready_for_checkin' | 'pending_checkout' | 'no_show' }
 */
async function triggerJob(req, res) {
  try {
    const { jobType } = req.body;

    if (!jobType) {
      return res.status(400).json({
        error: 'El campo jobType es requerido',
        validTypes: ['ready_for_checkin', 'pending_checkout', 'no_show'],
      });
    }

    const validTypes = ['ready_for_checkin', 'pending_checkout', 'no_show'];
    if (!validTypes.includes(jobType)) {
      return res.status(400).json({
        error: `jobType inválido. Tipos válidos: ${validTypes.join(', ')}`,
      });
    }

    const job = await triggerManualJob(jobType);

    res.status(200).json({
      message: `Job ${jobType} ejecutado manualmente`,
      jobId: job.id,
      jobName: job.name,
      jobData: job.data,
    });
  } catch (error) {
    console.error('Error triggering manual job:', error);
    res.status(500).json({
      error: 'Error al ejecutar el job manualmente',
      details: error.message,
    });
  }
}

/**
 * Obtener información de todos los schedulers
 * GET /api/v1/system/scheduler/info
 */
async function getInfo(req, res) {
  try {
    const info = await getSchedulersInfo();

    res.status(200).json({
      schedulers: info,
      description: {
        readyForCheckin: 'Ejecuta diariamente a las 11:00 AM - Cambia reservas confirmadas a ready_for_checkin',
        pendingCheckout: 'Ejecuta diariamente a las 09:00 AM - Cambia reservas in_progress a pending_checkout',
        noShow: 'Ejecuta diariamente a las 17:00 - Marca reservas ready_for_checkin como no_show',
      },
    });
  } catch (error) {
    console.error('Error getting schedulers info:', error);
    res.status(500).json({
      error: 'Error al obtener información de schedulers',
      details: error.message,
    });
  }
}

module.exports = {
  triggerJob,
  getInfo,
};
