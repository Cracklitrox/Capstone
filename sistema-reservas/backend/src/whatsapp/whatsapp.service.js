const prisma = require('../db/prisma.client');
const { getIO } = require('../config/socket');

// Almacenamiento en memoria para sesiones de chat (temporal)
// TODO: Migrar a Redis para producción
const chatSessions = new Map();

// Estadísticas del bot
const stats = {
  totalConversations: 0,
  completedReservations: 0,
  abandonedConversations: 0,
  messagesProcessed: 0,
  startTime: new Date()
};

let whatsappClient = null;

class WhatsAppService {
  /**
   * Configurar el cliente de WhatsApp
   */
  setClient(client) {
    whatsappClient = client;
  }

  /**
   * Obtener o crear sesión de conversación
   */
  async getOrCreateSession(phoneNumber) {
    if (!chatSessions.has(phoneNumber)) {
      // Crear nueva sesión
      const session = {
        phoneNumber,
        state: 'INITIAL',
        data: {},
        startedAt: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
        completed: false
      };
      
      chatSessions.set(phoneNumber, session);
      stats.totalConversations++;
      
      console.log(`✨ Nueva sesión creada para ${phoneNumber}`);
    } else {
      // Actualizar última actividad
      const session = chatSessions.get(phoneNumber);
      session.lastActivity = new Date();
      session.messageCount++;
    }

    stats.messagesProcessed++;
    return chatSessions.get(phoneNumber);
  }

  /**
   * Actualizar estado de la sesión
   */
  updateSession(phoneNumber, updates) {
    const session = chatSessions.get(phoneNumber);
    if (session) {
      Object.assign(session, updates);
      chatSessions.set(phoneNumber, session);
    }
  }

  /**
   * Limpiar sesión completada
   */
  async clearSession(phoneNumber) {
    const session = chatSessions.get(phoneNumber);
    if (session?.completed) {
      stats.completedReservations++;
    }
    
    chatSessions.delete(phoneNumber);
    console.log(`🗑️ Sesión limpiada para ${phoneNumber}`);
  }

  /**
   * Enviar mensaje de WhatsApp
   */
  async sendMessage(to, text) {
    if (!whatsappClient) {
      throw new Error('Cliente de WhatsApp no inicializado');
    }

    return await whatsappClient.sendMessage(to, text);
  }

  /**
   * Crear alerta de reserva para recepcionistas
   */
  async createBookingAlert(session) {
    try {
      const { phoneNumber, data } = session;

      // Crear alerta en la base de datos
      const guestName = data.name || 'Cliente';
      const checkIn = data.checkInDate || 'No especificado';
      const checkOut = data.checkOutDate || 'No especificado';
      const roomType = data.roomType || 'No especificado';
      const guests = `${data.adults || 1} adulto(s), ${data.children || 0} niño(s)`;

      const alert = await prisma.alerts.create({
        data: {
          type: 'booking_request',
          priority: 'medium',
          status: 'pending',
          title: 'Nueva Solicitud de Reserva desde WhatsApp',
          message: `Nueva solicitud de reserva recibida vía WhatsApp.

📱 Información de Contacto:
- Nombre: ${guestName}
- Teléfono: ${phoneNumber}
- RUT: ${data.rut || 'No proporcionado'}
- Email: ${data.email || 'No proporcionado'}

📅 Detalles de la Reserva:
- Check-in: ${checkIn}
- Check-out: ${checkOut}
- Tipo de Habitación: ${roomType}
- Huéspedes: ${guests}
${data.specialRequests ? `- Peticiones Especiales: ${data.specialRequests}` : ''}

Fuente: WhatsApp Bot
Fecha de Solicitud: ${new Date().toLocaleString('es-CL')}`,
          target_role: 'receptionist',
          action_type: 'create_reservation',
          origin_user_id: null, // No hay usuario registrado aún
          reservation_id: null,
          payment_id: null
        }
      });

      console.log(`✅ Alerta creada con ID: ${alert.id}`);

      // Notificar a recepcionistas vía Socket.IO
      const io = getIO();
      if (io) {
        io.to('role:receptionist').emit('alert:new', {
          id: alert.id,
          type: 'booking_request',
          message: `📱 Nueva solicitud de reserva desde WhatsApp de ${data.name || 'Cliente'}`,
          data: {
            phone: phoneNumber,
            guestName: data.name,
            checkIn: data.checkInDate,
            checkOut: data.checkOutDate,
            roomType: data.roomType
          },
          createdAt: alert.created_at
        });

        console.log('📢 Notificación enviada a recepcionistas');
      }

      return alert;
    } catch (error) {
      console.error('❌ Error al crear alerta:', error);
      throw error;
    }
  }

  /**
   * Validar disponibilidad de habitación
   */
  async checkRoomAvailability(roomType, checkIn, checkOut) {
    try {
      // Buscar habitaciones del tipo solicitado por nombre o ID
      const whereClause = isNaN(roomType) 
        ? { room_types: { name: { equals: roomType, mode: 'insensitive' } } }
        : { room_type_id: parseInt(roomType) };

      const rooms = await prisma.rooms.findMany({
        where: {
          ...whereClause,
          status: 'available',
          is_active: true
        },
        include: {
          room_types: true
        }
      });

      if (rooms.length === 0) {
        return { 
          available: false, 
          reason: 'No hay habitaciones de este tipo disponibles',
          count: 0,
          total: 0
        };
      }

      // Verificar reservas existentes que se solapen con las fechas
      const overlappingReservations = await prisma.reservation_rooms.count({
        where: {
          room_id: {
            in: rooms.map(r => r.id)
          },
          reservations: {
            status: {
              in: ['pending', 'confirmed']
            },
            OR: [
              {
                AND: [
                  { check_in_date: { lte: new Date(checkIn) } },
                  { check_out_date: { gt: new Date(checkIn) } }
                ]
              },
              {
                AND: [
                  { check_in_date: { lt: new Date(checkOut) } },
                  { check_out_date: { gte: new Date(checkOut) } }
                ]
              },
              {
                AND: [
                  { check_in_date: { gte: new Date(checkIn) } },
                  { check_out_date: { lte: new Date(checkOut) } }
                ]
              }
            ]
          }
        }
      });

      const availableRooms = rooms.length - overlappingReservations;

      return {
        available: availableRooms > 0,
        count: availableRooms,
        total: rooms.length,
        roomTypeName: rooms[0]?.room_types?.name || roomType
      };
    } catch (error) {
      console.error('❌ Error al verificar disponibilidad:', error);
      return { available: false, error: error.message, count: 0, total: 0 };
    }
  }

  /**
   * Obtener tipos de habitación activos desde la BD
   */
  async getRoomTypes() {
    try {
      const roomTypes = await prisma.room_types.findMany({
        where: {
          is_active: true
        },
        select: {
          id: true,
          name: true,
          base_capacity: true,
          description: true,
          bed_configuration: true
        },
        orderBy: {
          id: 'asc'
        }
      });

      return roomTypes;
    } catch (error) {
      console.error('❌ Error al obtener tipos de habitación:', error);
      return [];
    }
  }

  /**
   * Obtener tipos de habitación disponibles
   */
  async getAvailableRoomTypes() {
    try {
      const roomTypes = await prisma.rooms.groupBy({
        by: ['room_type'],
        where: {
          status: {
            in: ['available', 'occupied']
          }
        },
        _count: {
          room_type: true
        }
      });

      return roomTypes.map(rt => ({
        type: rt.room_type,
        count: rt._count.room_type
      }));
    } catch (error) {
      console.error('❌ Error al obtener tipos de habitación:', error);
      return [];
    }
  }

  /**
   * Obtener estado del cliente
   */
  getClientStatus() {
    if (!whatsappClient) {
      return { connected: false, error: 'Cliente no inicializado' };
    }
    return whatsappClient.getStatus();
  }

  /**
   * Desconectar cliente
   */
  async disconnect() {
    if (!whatsappClient) {
      throw new Error('Cliente no inicializado');
    }
    return await whatsappClient.disconnect();
  }

  /**
   * Limpiar credenciales y generar nuevo QR
   */
  async clearAuth() {
    if (!whatsappClient) {
      throw new Error('Cliente no inicializado');
    }
    return await whatsappClient.clearAuth();
  }

  /**
   * Obtener estadísticas del bot
   */
  async getStats() {
    // Limpiar sesiones inactivas (más de 30 minutos sin actividad)
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    
    let inactiveSessions = 0;
    for (const [phoneNumber, session] of chatSessions.entries()) {
      if (session.lastActivity < thirtyMinutesAgo) {
        chatSessions.delete(phoneNumber);
        inactiveSessions++;
        stats.abandonedConversations++;
      }
    }

    if (inactiveSessions > 0) {
      console.log(`🧹 Limpiadas ${inactiveSessions} sesiones inactivas`);
    }

    return {
      ...stats,
      activeSessions: chatSessions.size,
      uptime: Math.floor((now - stats.startTime) / 1000), // segundos
    };
  }

  /**
   * Limpiar todas las sesiones (para reinicio)
   */
  clearAllSessions() {
    const count = chatSessions.size;
    chatSessions.clear();
    console.log(`🗑️ ${count} sesiones limpiadas`);
    return count;
  }
}

module.exports = new WhatsAppService();
