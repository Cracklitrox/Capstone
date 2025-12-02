/**
 * Scheduler Service - Main Entry Point
 *
 * Inicializa las queues y workers para automatización de estados de reservas.
 * Este servicio debe iniciarse junto con el servidor Express.
 */

import { Queue } from 'bullmq';
import {
  connection,
  QUEUE_NAMES,
  SCHEDULER_IDS,
  CRON_PATTERNS,
  DEFAULT_JOB_OPTIONS,
} from './config.js';

// Importar workers (esto los activa automáticamente)
import readyForCheckinWorker from './workers/readyForCheckin.worker.js';
import pendingCheckoutWorker from './workers/pendingCheckout.worker.js';
import noShowWorker from './workers/noShow.worker.js';

// Crear queues
const queues = {
  readyForCheckin: new Queue(QUEUE_NAMES.READY_FOR_CHECKIN, { connection }),
  pendingCheckout: new Queue(QUEUE_NAMES.PENDING_CHECKOUT, { connection }),
  noShow: new Queue(QUEUE_NAMES.NO_SHOW, { connection }),
};

/**
 * Inicializa todos los schedulers con sus cron patterns
 */
async function initializeSchedulers() {

  try {
    // Scheduler 1: Ready for Check-in (11:00 AM diario)
    await queues.readyForCheckin.upsertJobScheduler(
      SCHEDULER_IDS.READY_FOR_CHECKIN,
      {
        pattern: CRON_PATTERNS.READY_FOR_CHECKIN,
      },
      {
        name: 'ready-for-checkin-daily',
        data: { timestamp: new Date().toISOString() },
        opts: DEFAULT_JOB_OPTIONS,
      }
    );

    // Scheduler 2: Pending Checkout (09:00 AM diario)
    await queues.pendingCheckout.upsertJobScheduler(
      SCHEDULER_IDS.PENDING_CHECKOUT,
      {
        pattern: CRON_PATTERNS.PENDING_CHECKOUT,
      },
      {
        name: 'pending-checkout-daily',
        data: { timestamp: new Date().toISOString() },
        opts: DEFAULT_JOB_OPTIONS,
      }
    );

    // Scheduler 3: No-Show (17:00 diario)
    await queues.noShow.upsertJobScheduler(
      SCHEDULER_IDS.NO_SHOW,
      {
        pattern: CRON_PATTERNS.NO_SHOW,
      },
      {
        name: 'no-show-daily',
        data: { timestamp: new Date().toISOString() },
        opts: DEFAULT_JOB_OPTIONS,
      }
    );

  } catch (error) {
    throw error;
  }
}

/**
 * Detiene todos los workers y cierra conexiones
 */
async function shutdown() {

  try {
    // Cerrar workers
    await readyForCheckinWorker.close();
    await pendingCheckoutWorker.close();
    await noShowWorker.close();

    // Cerrar queues
    await queues.readyForCheckin.close();
    await queues.pendingCheckout.close();
    await queues.noShow.close();

    // Cerrar conexión Redis
    await connection.quit();

  } catch (error) {
    throw error;
  }
}

/**
 * Ejecuta manualmente un job específico (útil para testing)
 * @param {string} jobType - 'ready_for_checkin' | 'pending_checkout' | 'no_show'
 */
async function triggerManualJob(jobType) {

  try {
    let queue;
    let jobName;

    switch (jobType) {
      case 'ready_for_checkin':
        queue = queues.readyForCheckin;
        jobName = 'ready-for-checkin-manual';
        break;
      case 'pending_checkout':
        queue = queues.pendingCheckout;
        jobName = 'pending-checkout-manual';
        break;
      case 'no_show':
        queue = queues.noShow;
        jobName = 'no-show-manual';
        break;
      default:
        throw new Error(`Invalid job type: ${jobType}`);
    }

    const job = await queue.add(jobName, {
      timestamp: new Date().toISOString(),
      manual: true,
    });

    return job;
  } catch (error) {
    throw error;
  }
}

/**
 * Obtiene información de todos los schedulers activos
 */
async function getSchedulersInfo() {
  const info = {};

  try {
    // Ready for Check-in
    const readyScheduler = await queues.readyForCheckin.getJobScheduler(
      SCHEDULER_IDS.READY_FOR_CHECKIN
    );
    info.readyForCheckin = readyScheduler;

    // Pending Checkout
    const checkoutScheduler = await queues.pendingCheckout.getJobScheduler(
      SCHEDULER_IDS.PENDING_CHECKOUT
    );
    info.pendingCheckout = checkoutScheduler;

    // No-Show
    const noShowScheduler = await queues.noShow.getJobScheduler(SCHEDULER_IDS.NO_SHOW);
    info.noShow = noShowScheduler;

    return info;
  } catch (error) {
    throw error;
  }
}

export default {
  initializeSchedulers,
  shutdown,
  triggerManualJob,
  getSchedulersInfo,
  queues,
  workers: {
    readyForCheckinWorker,
    pendingCheckoutWorker,
    noShowWorker,
  },
};

export {
  initializeSchedulers,
  shutdown,
  triggerManualJob,
  getSchedulersInfo,
  queues,
};
