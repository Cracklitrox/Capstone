const { createClient } = require('redis');

const redisClient = createClient({
  // La URL apunta al servicio 'redis' que definimos en docker-compose.
  // 'redis://' es el protocolo, 'redis' es el nombre del host (servicio), 
  // y 6379 es el puerto por defecto de Redis.
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

redisClient.connect().catch(console.error);

module.exports = redisClient;