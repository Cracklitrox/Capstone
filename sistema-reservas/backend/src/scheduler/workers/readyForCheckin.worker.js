/**
 * Ready for Check-in Worker
 *
 * Ejecuta diariamente a las 11:00 AM para cambiar reservas confirmadas
 * a 'ready_for_checkin' cuando es su día de check-in.
 */

import { Worker } from 'bullmq';
import { connection, QUEUE_NAMES } from '../config.js';
import prisma from '../../db/prisma.client.js';
import statusService from '../../api/reservations/status.service.js';
const { changeReservationStatus } = statusService;

const processor = async (job) => {
  const { id, data } = job;


  try {
    // Obtener fecha actual (solo fecha, sin hora)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar reservas que:
    // 1. Están confirmadas
    // 2. Su check-in es HOY
    // 3. No han sido eliminadas
    const reservations = await prisma.reservations.findMany({
      where: {
        status: 'confirmed',
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


    const results = {
      success: [],
      failed: [],
    };

    // Cambiar estado de cada reserva
    for (const reservation of reservations) {
      try {
        await changeReservationStatus(
          reservation.id,
          'ready_for_checkin',
          null, // userId (sistema automático)
          'Cambio automático por scheduler - día de check-in'
        );

        results.success.push(reservation.code);
      } catch (error) {
        results.failed.push({
          code: reservation.code,
          error: error.message,
        });
      }
    }

    const summary = {
      total: reservations.length,
      success: results.success.length,
      failed: results.failed.length,
      successCodes: results.success,
      failures: results.failed,
    };


    return summary;
  } catch (error) {
    throw error; // Permite que BullMQ reintente
  }
};

// Crear worker
const worker = new Worker(QUEUE_NAMES.READY_FOR_CHECKIN, processor, {
  connection,
  concurrency: 1, // Procesar un job a la vez (evitar race conditions)
});

// Event listeners
worker.on('completed', (job, returnvalue) => {
});

worker.on('failed', (job, error) => {
});

worker.on('error', (error) => {
});

export default worker;
