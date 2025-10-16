require("dotenv").config();

const app = require("./app");
const http = require("http");
const { initializeSocket } = require("./config/socket");

const port = process.env.PORT || 3001;

if (require.main === module) {
  const server = http.createServer(app);

  // Inicializar Socket.io
  initializeSocket(server);

  server.listen(port, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${port}`);
    console.log(`🔌 Socket.IO inicializado`);
  });

  // ==================== CRON JOB: CHECKOUT ALERTS ====================
  const notificationsService = require("./api/notifications/notifications.service");
  const { emitCheckoutAlerts } = require("./config/socket");

  /**
   * Emite checkout alerts via WebSocket cada 5 minutos
   */
  async function emitCheckoutAlertsJob() {
    try {
      const alerts = await notificationsService.getCheckoutAlertsForToday();

      // Solo emitir si hay al menos un checkout
      if (alerts.length > 0) {
        emitCheckoutAlerts(alerts.length, alerts);
        console.log(`📬 Checkout alerts emitidos: ${alerts.length} checkouts`);
      } else {
        console.log("⏭️ No hay checkouts para hoy, saltando emisión");
      }
    } catch (error) {
      console.error("❌ Error en cron job de checkout alerts:", error);
    }
  }

  // Ejecutar inmediatamente al iniciar el servidor (después de 5 segundos)
  setTimeout(() => {
    console.log("🚀 Ejecutando primera emisión de checkout alerts...");
    emitCheckoutAlertsJob();
  }, 5000); // Esperar 5 segundos para que Socket.io se inicialice

  // Luego ejecutar cada 5 minutos (300,000 ms)
  const checkoutAlertsInterval = setInterval(
    emitCheckoutAlertsJob,
    5 * 60 * 1000
  );

  console.log("⏰ Cron job de checkout alerts configurado (cada 5 min)");

  // Cleanup al cerrar el servidor
  process.on("SIGINT", () => {
    console.log("🛑 Cerrando servidor...");
    clearInterval(checkoutAlertsInterval);
    process.exit(0);
  });
}
