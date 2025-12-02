import "dotenv/config";

import app from "./app.js";
import http from "http";
import { initializeSocket, emitCheckoutAlerts } from "./config/socket.js";
import WhatsAppClient from './whatsapp-bot/whatsapp.client.js';
import whatsappController from './whatsapp-bot/whatsapp.controller.js';
import whatsappService from './whatsapp-bot/whatsapp.service.js';
import notificationsService from "./api/notifications/notifications.service.js";
import { initializeSchedulers, shutdown as shutdownSchedulers } from "./scheduler/index.js";


const port = process.env.PORT || 3001;

const server = http.createServer(app);

// Inicializar Socket.io
const io = initializeSocket(server);

// ==================== INICIALIZAR WHATSAPP BOT ====================
const whatsappEnabled = process.env.WHATSAPP_ENABLED === 'true';

if (whatsappEnabled) {
  const whatsappClient = new WhatsAppClient(io);

  // Configurar el cliente en el servicio
  whatsappService.setClient(whatsappClient);

  // Configurar el handler de mensajes
  whatsappClient.setMessageHandler(whatsappController.handleMessage.bind(whatsappController));

  // Inicializar el cliente (conectar a WhatsApp)
  whatsappClient.initialize().catch(error => {
  });

} else {
}

server.listen(port, () => {
});

// ==================== CRON JOB: CHECKOUT ALERTS ====================

/**
 * Crea/actualiza alertas de checkout en BD y las emite via WebSocket cada 5 minutos
 */
async function emitCheckoutAlertsJob() {
  try {
    // Primero crear/actualizar alertas en la tabla alerts
    await notificationsService.createOrUpdateCheckoutAlerts();

    // Luego obtener las alertas para emitirlas
    const alerts = await notificationsService.getCheckoutAlertsForToday();

    // Solo emitir si hay al menos un checkout
    if (alerts.length > 0) {
      emitCheckoutAlerts(alerts.length, alerts);
    } else {
    }
  } catch (error) {
  }
}

// Ejecutar inmediatamente al iniciar el servidor (después de 5 segundos)
setTimeout(() => {
  emitCheckoutAlertsJob();
}, 5000); // Esperar 5 segundos para que Socket.io se inicialice

// Luego ejecutar cada 5 minutos (300,000 ms)
const checkoutAlertsInterval = setInterval(
  emitCheckoutAlertsJob,
  5 * 60 * 1000
);


// ==================== INICIALIZAR BULLMQ SCHEDULERS ====================

// Inicializar schedulers después de que el servidor esté listo
setTimeout(async () => {
  try {
    await initializeSchedulers();
  } catch (error) {
  }
}, 3000); // Esperar 3 segundos para que Redis esté completamente listo

// Cleanup al cerrar el servidor
process.on("SIGINT", async () => {
  clearInterval(checkoutAlertsInterval);

  // Cerrar schedulers
  try {
    await shutdownSchedulers();
  } catch (error) {
  }

  process.exit(0);
});

process.on("SIGTERM", async () => {
  clearInterval(checkoutAlertsInterval);

  try {
    await shutdownSchedulers();
  } catch (error) {
  }

  process.exit(0);
});
