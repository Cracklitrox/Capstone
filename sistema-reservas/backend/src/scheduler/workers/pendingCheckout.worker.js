/**
 * Pending Checkout Worker
 *
 * Ejecuta diariamente a las 09:00 AM para cambiar reservas en progreso
 * a 'pending_checkout' cuando es su día de check-out.
 */

const { Worker } = require('bullmq');
const { connection, QUEUE_NAMES } = require('../config');
const prisma = require('../../db/prisma.client');
const { changeReservationStatus } = require('../../api/reservations/status.service');

const processor = async (job) => {
  const { id, data } = job;

  console.log(`\n🔔 [${new Date().toISOString()}] Processing pending_checkout job ${id}`);

  try {
    // Obtener fecha actual (solo fecha, sin hora)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar reservas que:
    // 1. Están en progreso (hospedados actualmente)
    // 2. Su check-out es HOY
    // 3. No han sido eliminadas
    const reservations = await prisma.reservations.findMany({
      where: {
        status: 'in_progress',
        check_out_date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Antes del siguiente día
        },
        deleted_at: null,
      },
      select: {
        id: true,
        code: true,
        check_out_date: true,
      },
    });

    console.log(`   Found ${reservations.length} reservations pending checkout`);

    const results = {
      success: [],
      failed: [],
    };

    // Cambiar estado de cada reserva
    for (const reservation of reservations) {
      try {
        await changeReservationStatus(
          reservation.id,
          'pending_checkout',
          null, // userId (sistema automático)
          'Cambio automático por scheduler - día de check-out'
        );

        results.success.push(reservation.code);
        console.log(`   ✅ Reservation ${reservation.code} → pending_checkout`);
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
      failed: results.failed.length,
      successCodes: results.success,
      failures: results.failed,
    };

    console.log(`\n📊 Pending Checkout Summary:`);
    console.log(`   Total: ${summary.total}`);
    console.log(`   Success: ${summary.success}`);
    console.log(`   Failed: ${summary.failed}`);

    return summary;
  } catch (error) {
    console.error('❌ Pending Checkout job failed:', error);
    throw error; // Permite que BullMQ reintente
  }
};

// Crear worker
const worker = new Worker(QUEUE_NAMES.PENDING_CHECKOUT, processor, {
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
