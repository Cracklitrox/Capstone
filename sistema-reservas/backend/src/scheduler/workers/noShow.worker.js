/**
 * No-Show Worker
 *
 * Ejecuta diariamente a las 17:00 (15:00 + 2h) para marcar como 'no_show'
 * las reservas que estaban ready_for_checkin pero nunca hicieron check-in.
 */

const { Worker } = require('bullmq');
const { connection, QUEUE_NAMES } = require('../config');
const prisma = require('../../db/prisma.client');
const { changeReservationStatus } = require('../../api/reservations/status.service');

const processor = async (job) => {
  const { id, data } = job;

  console.log(`\n🔔 [${new Date().toISOString()}] Processing no_show job ${id}`);

  try {
    // Obtener configuración de no-show hours
    const noShowSetting = await prisma.system_settings.findFirst({
      where: { setting_key: 'noshow_hours_after_checkin' },
    });

    const noShowHours = noShowSetting ? parseInt(noShowSetting.setting_value) : 2;

    // Obtener hora actual
    const now = new Date();

    // Obtener inicio del día actual
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Obtener hora límite de check-in (desde system_settings)
    const checkinEndSetting = await prisma.system_settings.findFirst({
      where: { setting_key: 'checkin_end_time' },
    });

    const checkinEndTime = checkinEndSetting ? checkinEndSetting.setting_value : '15:00';
    const [endHour, endMinute] = checkinEndTime.split(':').map(Number);

    // Crear fecha límite: HOY a la hora de fin de check-in + noShowHours
    const noShowDeadline = new Date(today);
    noShowDeadline.setHours(endHour + noShowHours, endMinute, 0, 0);

    console.log(`   No-show deadline: ${noShowDeadline.toISOString()}`);
    console.log(`   Current time: ${now.toISOString()}`);

    // Buscar reservas que:
    // 1. Están ready_for_checkin
    // 2. Su check-in era HOY
    // 3. Ya pasó la hora límite de no-show
    // 4. No han sido eliminadas
    const reservations = await prisma.reservations.findMany({
      where: {
        status: 'ready_for_checkin',
        check_in_date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Antes del siguiente día
        },
        deleted_at: null,
      },
      select: {
        id: true,
        code: true,
        check_in_date: true,
      },
    });

    console.log(`   Found ${reservations.length} reservations still in ready_for_checkin`);

    const results = {
      success: [],
      skipped: [],
      failed: [],
    };

    // Cambiar estado de cada reserva
    for (const reservation of reservations) {
      try {
        // Verificar si ya pasó el deadline para este reservation
        // (en caso de que tenga check-in personalizado)
        if (now >= noShowDeadline) {
          await changeReservationStatus({
            reservationId: reservation.id,
            newStatus: 'no_show',
            userId: null, // sistema automático
            userRole: null,
            reason: `Cambio automático por scheduler - no se presentó después de ${noShowHours}h del fin de check-in`
          });

          results.success.push(reservation.code);
          console.log(`   ✅ Reservation ${reservation.code} → no_show`);
        } else {
          results.skipped.push(reservation.code);
          console.log(`   ⏭️  Reservation ${reservation.code} skipped (deadline not reached yet)`);
        }
      } catch (error) {
        results.failed.push({
          code: reservation.code,
          error: error.message,
        });
        console.error(`   ❌ Reservation ${reservation.code} failed:`, error.message);
      }
    }

    const summary = {
      total: reservations.length,
      success: results.success.length,
      skipped: results.skipped.length,
      failed: results.failed.length,
      successCodes: results.success,
      skippedCodes: results.skipped,
      failures: results.failed,
      deadline: noShowDeadline.toISOString(),
    };

    console.log(`\n📊 No-Show Summary:`);
    console.log(`   Total: ${summary.total}`);
    console.log(`   Success: ${summary.success}`);
    console.log(`   Skipped: ${summary.skipped}`);
    console.log(`   Failed: ${summary.failed}`);

    return summary;
  } catch (error) {
    console.error('❌ No-Show job failed:', error);
    throw error; // Permite que BullMQ reintente
  }
};

// Crear worker
const worker = new Worker(QUEUE_NAMES.NO_SHOW, processor, {
  connection,
  concurrency: 1, // Procesar un job a la vez (evitar race conditions)
});

// Event listeners
worker.on('completed', (job, returnvalue) => {
  console.log(`✅ Job ${job.id} completed successfully`);
});

worker.on('failed', (job, error) => {
  console.error(`❌ Job ${job.id} failed:`, error.message);
});

worker.on('error', (error) => {
  console.error('❌ Worker error:', error);
});

module.exports = worker;
