import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL
});

// Conectar automáticamente al importar
redisClient.connect().catch(err => {
  console.error('❌ Error conectando a Redis:', err);
});

// Manejar eventos de conexión
redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis conectado exitosamente');
});

export default redisClient;
