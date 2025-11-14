/**
 * Scheduler Service - Main Entry Point
 *
 * Inicializa las queues y workers para automatización de estados de reservas.
 * Este servicio debe iniciarse junto con el servidor Express.
 */

const { Queue } = require('bullmq');
const {
  connection,
  QUEUE_NAMES,
  SCHEDULER_IDS,
  CRON_PATTERNS,
  DEFAULT_JOB_OPTIONS,
} = require('./config');

// Importar workers (esto los activa automáticamente)
const readyForCheckinWorker = require('./workers/readyForCheckin.worker');
const pendingCheckoutWorker = require('./workers/pendingCheckout.worker');
const noShowWorker = require('./workers/noShow.worker');

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
  console.log('\n🚀 Initializing BullMQ Schedulers...\n');

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
    console.log(`✅ Scheduler configured: Ready for Check-in (${CRON_PATTERNS.READY_FOR_CHECKIN})`);

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
    console.log(`✅ Scheduler configured: Pending Checkout (${CRON_PATTERNS.PENDING_CHECKOUT})`);

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
    console.log(`✅ Scheduler configured: No-Show (${CRON_PATTERNS.NO_SHOW})`);

    console.log('\n✨ All schedulers initialized successfully\n');
  } catch (error) {
    console.error('❌ Error initializing schedulers:', error);
    throw error;
  }
}

/**
 * Detiene todos los workers y cierra conexiones
 */
async function shutdown() {
  console.log('\n🛑 Shutting down schedulers...');

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

    console.log('✅ Schedulers shut down successfully');
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    throw error;
  }
}

/**
 * Ejecuta manualmente un job específico (útil para testing)
 * @param {string} jobType - 'ready_for_checkin' | 'pending_checkout' | 'no_show'
 */
async function triggerManualJob(jobType) {
  console.log(`\n🔧 Manually triggering job: ${jobType}`);

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

    console.log(`✅ Job ${job.id} triggered successfully`);
    return job;
  } catch (error) {
    console.error('❌ Error triggering manual job:', error);
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
    console.error('❌ Error getting schedulers info:', error);
    throw error;
  }
}

module.exports = {
  initializeSchedulers,
  shutdown,
  triggerManualJob,
  getSchedulersInfo,
  queues, // Exportar queues para uso externo si es necesario
  workers: {
    readyForCheckinWorker,
    pendingCheckoutWorker,
    noShowWorker,
  },
};
