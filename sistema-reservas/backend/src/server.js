require('dotenv').config();

const app = require('./app');
const http = require('http');
const { initializeSocket } = require('./config/socket');

const port = process.env.PORT || 3001;

if (require.main === module) {
  const server = http.createServer(app);
  
  // Inicializar Socket.io
  initializeSocket(server);
  
  server.listen(port, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${port}`);
    console.log(`🔌 Socket.io inicializado`);
  });
}