/**
 * BullMQ Configuration
 *
 * Configuración centralizada para queues y workers de BullMQ.
 * Reutiliza la conexión Redis existente del proyecto.
 */

const IORedis = require('ioredis');

// Crear conexión Redis para BullMQ
// BullMQ requiere ioredis, no el cliente redis estándar
const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // Requerido por BullMQ
  enableReadyCheck: false,
});

connection.on('error', (err) => {
  console.error('❌ BullMQ Redis Connection Error:', err);
});

connection.on('connect', () => {
  console.log('✅ BullMQ Redis Connected');
});

// Nombres de queues
const QUEUE_NAMES = {
  READY_FOR_CHECKIN: 'ready-for-checkin',
  PENDING_CHECKOUT: 'pending-checkout',
  NO_SHOW: 'no-show',
};

// IDs de schedulers (para upsertJobScheduler)
const SCHEDULER_IDS = {
  READY_FOR_CHECKIN: 'scheduler-ready-for-checkin',
  PENDING_CHECKOUT: 'scheduler-pending-checkout',
  NO_SHOW: 'scheduler-no-show',
};

// Configuración de horarios (cron patterns)
// Formato cron: segundo minuto hora día mes día-semana
const CRON_PATTERNS = {
  // Ejecutar todos los días a las 11:00 AM (inicio check-in)
  READY_FOR_CHECKIN: '0 0 11 * * *',

  // Ejecutar todos los días a las 09:00 AM (inicio check-out)
  PENDING_CHECKOUT: '0 0 9 * * *',

  // Ejecutar todos los días a las 17:00 (15:00 + 2h no-show)
  NO_SHOW: '0 0 17 * * *',
};

// Opciones por defecto para jobs
const DEFAULT_JOB_OPTIONS = {
  attempts: 3, // Reintentar hasta 3 veces si falla
  backoff: {
    type: 'exponential',
    delay: 2000, // 2 segundos inicial
  },
  removeOnComplete: {
    age: 86400, // Mantener jobs completados por 24 horas
    count: 100, // Máximo 100 jobs completados guardados
  },
  removeOnFail: {
    age: 604800, // Mantener jobs fallidos por 7 días
  },
};

module.exports = {
  connection,
  QUEUE_NAMES,
  SCHEDULER_IDS,
  CRON_PATTERNS,
  DEFAULT_JOB_OPTIONS,
};
