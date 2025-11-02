const redisClient = require('../db/redis.client');

/**
 * Servicio de rate limiting para mensajes de WhatsApp
 * Limita a 30 mensajes por minuto por número de teléfono
 */
class RateLimiterService {
  constructor() {
    this.prefix = 'whatsapp:rate:';
    this.maxMessages = 30; // Máximo de mensajes
    this.windowSeconds = 60; // Ventana de 1 minuto
  }

  /**
   * Obtener clave de Redis para un número de teléfono
   */
  _getKey(phoneNumber) {
    return `${this.prefix}${phoneNumber}`;
  }

  /**
   * Verificar si un número de teléfono ha excedido el rate limit
   * @param {string} phoneNumber - Número de teléfono
   * @returns {Promise<{allowed: boolean, remaining: number, resetIn: number}>}
   */
  async checkLimit(phoneNumber) {
    try {
      const key = this._getKey(phoneNumber);
      const now = Date.now();

      // Agregar timestamp actual a la lista
      await redisClient.zAdd(key, { score: now, value: now.toString() });

      // Remover timestamps antiguos (fuera de la ventana)
      const windowStart = now - (this.windowSeconds * 1000);
      await redisClient.zRemRangeByScore(key, 0, windowStart);

      // Contar mensajes en la ventana actual
      const count = await redisClient.zCount(key, windowStart, now);

      // Establecer expiración de la clave
      await redisClient.expire(key, this.windowSeconds);

      const allowed = count <= this.maxMessages;
      const remaining = Math.max(0, this.maxMessages - count);
      const resetIn = this.windowSeconds;

      return {
        allowed,
        remaining,
        resetIn,
        current: count
      };
    } catch (error) {
      console.error(`Error al verificar rate limit para ${phoneNumber}:`, error);
      // En caso de error de Redis, permitir el mensaje (fail-open)
      return {
        allowed: true,
        remaining: this.maxMessages,
        resetIn: this.windowSeconds,
        current: 0,
        error: true
      };
    }
  }

  /**
   * Resetear el contador de mensajes para un número
   * @param {string} phoneNumber - Número de teléfono
   */
  async reset(phoneNumber) {
    try {
      const key = this._getKey(phoneNumber);
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error(`Error al resetear rate limit para ${phoneNumber}:`, error);
      return false;
    }
  }

  /**
   * Obtener estadísticas del rate limiter
   * @param {string} phoneNumber - Número de teléfono
   * @returns {Promise<Object>}
   */
  async getStats(phoneNumber) {
    try {
      const key = this._getKey(phoneNumber);
      const now = Date.now();
      const windowStart = now - (this.windowSeconds * 1000);

      const count = await redisClient.zCount(key, windowStart, now);
      const ttl = await redisClient.ttl(key);

      return {
        phoneNumber,
        messagesInWindow: count,
        maxMessages: this.maxMessages,
        remaining: Math.max(0, this.maxMessages - count),
        windowSeconds: this.windowSeconds,
        resetIn: ttl > 0 ? ttl : this.windowSeconds
      };
    } catch (error) {
      console.error(`Error al obtener estadísticas para ${phoneNumber}:`, error);
      return null;
    }
  }

  /**
   * Verificar si un número está bloqueado temporalmente
   * @param {string} phoneNumber - Número de teléfono
   * @returns {Promise<boolean>}
   */
  async isBlocked(phoneNumber) {
    const result = await this.checkLimit(phoneNumber);
    return !result.allowed;
  }
}

module.exports = new RateLimiterService();
