const redisClient = require('../db/redis.client');

/**
 * Servicio para manejar sesiones de WhatsApp en Redis
 * Las sesiones se almacenan con un TTL de 30 minutos
 */
class RedisSessionService {
  constructor() {
    this.prefix = 'whatsapp:session:';
    this.ttl = 1800; // 30 minutos en segundos
  }

  /**
   * Obtener clave de Redis para un número de teléfono
   */
  _getKey(phoneNumber) {
    return `${this.prefix}${phoneNumber}`;
  }

  /**
   * Obtener sesión de Redis
   * @param {string} phoneNumber - Número de teléfono
   * @returns {Object|null} Sesión o null si no existe
   */
  async getSession(phoneNumber) {
    try {
      const key = this._getKey(phoneNumber);
      const data = await redisClient.get(key);

      if (!data) {
        return null;
      }

      const session = JSON.parse(data);

      // Convertir fechas de string a Date
      if (session.startedAt) session.startedAt = new Date(session.startedAt);
      if (session.lastActivity) session.lastActivity = new Date(session.lastActivity);

      return session;
    } catch (error) {
      console.error(`Error al obtener sesión de Redis para ${phoneNumber}:`, error);
      return null;
    }
  }

  /**
   * Guardar o actualizar sesión en Redis
   * @param {string} phoneNumber - Número de teléfono
   * @param {Object} session - Datos de la sesión
   */
  async setSession(phoneNumber, session) {
    try {
      const key = this._getKey(phoneNumber);
      const data = JSON.stringify(session);

      // Guardar con TTL de 30 minutos
      await redisClient.setEx(key, this.ttl, data);

      return true;
    } catch (error) {
      console.error(`Error al guardar sesión en Redis para ${phoneNumber}:`, error);
      return false;
    }
  }

  /**
   * Actualizar TTL de la sesión (renovar tiempo de expiración)
   * @param {string} phoneNumber - Número de teléfono
   */
  async refreshSession(phoneNumber) {
    try {
      const key = this._getKey(phoneNumber);
      await redisClient.expire(key, this.ttl);
      return true;
    } catch (error) {
      console.error(`Error al renovar TTL de sesión para ${phoneNumber}:`, error);
      return false;
    }
  }

  /**
   * Eliminar sesión de Redis
   * @param {string} phoneNumber - Número de teléfono
   */
  async deleteSession(phoneNumber) {
    try {
      const key = this._getKey(phoneNumber);
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error(`Error al eliminar sesión de Redis para ${phoneNumber}:`, error);
      return false;
    }
  }

  /**
   * Verificar si existe una sesión
   * @param {string} phoneNumber - Número de teléfono
   * @returns {boolean}
   */
  async hasSession(phoneNumber) {
    try {
      const key = this._getKey(phoneNumber);
      const exists = await redisClient.exists(key);
      return exists === 1;
    } catch (error) {
      console.error(`Error al verificar existencia de sesión para ${phoneNumber}:`, error);
      return false;
    }
  }

  /**
   * Obtener todas las sesiones activas (para estadísticas)
   * NOTA: Usar con precaución en producción, puede ser costoso
   * @returns {Array} Lista de sesiones
   */
  async getAllSessions() {
    try {
      const keys = await redisClient.keys(`${this.prefix}*`);
      const sessions = [];

      for (const key of keys) {
        const data = await redisClient.get(key);
        if (data) {
          const session = JSON.parse(data);
          sessions.push(session);
        }
      }

      return sessions;
    } catch (error) {
      console.error('Error al obtener todas las sesiones:', error);
      return [];
    }
  }

  /**
   * Contar sesiones activas
   * @returns {number} Cantidad de sesiones activas
   */
  async countActiveSessions() {
    try {
      const keys = await redisClient.keys(`${this.prefix}*`);
      return keys.length;
    } catch (error) {
      console.error('Error al contar sesiones activas:', error);
      return 0;
    }
  }

  /**
   * Limpiar todas las sesiones (útil para testing)
   */
  async clearAllSessions() {
    try {
      const keys = await redisClient.keys(`${this.prefix}*`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Error al limpiar todas las sesiones:', error);
      return false;
    }
  }

  /**
   * Obtener tiempo restante de una sesión (en segundos)
   * @param {string} phoneNumber - Número de teléfono
   * @returns {number} Segundos restantes, -1 si no existe o no tiene expiración
   */
  async getSessionTTL(phoneNumber) {
    try {
      const key = this._getKey(phoneNumber);
      const ttl = await redisClient.ttl(key);
      return ttl;
    } catch (error) {
      console.error(`Error al obtener TTL de sesión para ${phoneNumber}:`, error);
      return -1;
    }
  }
}

module.exports = new RedisSessionService();
