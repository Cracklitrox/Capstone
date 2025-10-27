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

      // Calcular costos para el resumen
      const nights = data.nights || 1;
      const roomPrice = data.roomInfo?.price || 0;
      const roomTotal = roomPrice * nights;

      let breakfastTotal = 0;
      if (data.services?.breakfast) {
        const breakfastQty = data.services.breakfastQuantity || 0;
        const breakfastPrice = 3000; // $3,000 por persona por noche
        breakfastTotal = breakfastPrice * breakfastQty * nights;
      }

      const totalReservation = roomTotal + breakfastTotal;

      // Crear resumen detallado completo para Socket.IO
      const fullSummary = {
        guest_principal: {
          name: data.name || '',
          rut: data.rut || '',
          email: data.email || '',
          phone: phoneNumber,
          birthdate: data.birthdate || '',
          gender: data.gender || '',
          country: data.country || '',
          region: data.region || '',
          city: data.city || ''
        },
        reservation: {
          check_in: data.checkInDateFormatted || data.checkInDate || '',
          check_out: data.checkOutDateFormatted || data.checkOutDate || '',
          nights: nights,
          room_id: data.roomId || null,
          room_number: data.roomNumber || '',
          room_type_id: data.roomTypeId || null,
          room_type_name: data.roomTypeName || '',
          adults: data.adults || 1,
          children_under_4: data.childrenUnder4 || 0,
          total_guests: data.totalGuests || 1,
          special_requests: data.specialRequests || ''
        },
        services: {
          laundry: data.services?.laundry || false,
          laundry_quantity: data.services?.laundryQuantity || 0,
          breakfast: data.services?.breakfast || false,
          breakfast_quantity: data.services?.breakfastQuantity || 0,
          breakfast_preferences: data.services?.breakfastPreferences || []
        },
        additional_guests: (data.additionalGuests || []).map(guest => ({
          name: guest.name,
          rut: guest.rut,
          email: guest.email || 'N/A',
          phone: guest.phone || 'N/A',
          is_child: guest.isChild || false
        })),
        costs: {
          room_price_per_night: roomPrice,
          room_nights: nights,
          room_total: roomTotal,
          breakfast_total: breakfastTotal,
          services_total: breakfastTotal,
          total: totalReservation
        },
        timestamp: new Date().toISOString()
      };

      // Crear mensaje corto para el campo detail (max 250 caracteres)
      const shortDetail = `WhatsApp: ${data.name || 'Cliente'} - ${data.roomTypeName || 'Habitación'} - ${nights}n - $${totalReservation.toLocaleString()}`;

      // Crear alerta en la base de datos con fullSummary
      const alert = await prisma.alerts.create({
        data: {
          type: 'booking_request',
          status: 'pending',
          origin_user_id: null,
          reservation_id: null,
          payment_id: null,
          detail: shortDetail,
          full_summary: fullSummary
        }
      });

      console.log(`✅ Alerta creada con ID: ${alert.id}`);

      // Notificar a recepcionistas vía Socket.IO con resumen completo
      const io = getIO();
      if (io) {
        io.to('role:receptionist').emit('alert:new', {
          id: alert.id,
          type: 'booking_request',
          status: 'pending',
          message: `📱 Nueva solicitud de reserva WhatsApp`,
          shortDetail: shortDetail,
          data: {
            phone: phoneNumber,
            guestName: data.name,
            checkIn: data.checkInDateFormatted || data.checkInDate,
            checkOut: data.checkOutDateFormatted || data.checkOutDate,
            roomType: data.roomTypeName,
            roomNumber: data.roomNumber,
            nights: nights,
            totalGuests: data.totalGuests,
            adults: data.adults,
            children: data.childrenUnder4,
            total: totalReservation
          },
          fullSummary: fullSummary,
          createdAt: alert.created_at
        });

        console.log('📢 Notificación enviada a recepcionistas con resumen completo');
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

      // Obtener IDs de habitaciones ocupadas en el rango de fechas
      const occupiedRoomIds = await prisma.reservation_rooms.findMany({
        where: {
          room_id: {
            in: rooms.map(r => r.id)
          },
          reservations: {
            status: {
              in: ['pending', 'confirmed', 'in_progress']
            },
            // Verificar overlap de fechas: las reservas se solapan si:
            // check_in de la reserva < check_out solicitado
            // Y check_out de la reserva > check_in solicitado
            check_in_date: { lt: new Date(checkOut) },
            check_out_date: { gt: new Date(checkIn) }
          }
        },
        select: {
          room_id: true
        }
      });

      const occupiedIds = new Set(occupiedRoomIds.map(r => r.room_id));
      const availableRooms = rooms.filter(r => !occupiedIds.has(r.id)).length;

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
          bed_configuration: true,
          rooms: {
            select: {
              base_price: true
            },
            where: {
              is_active: true
            },
            take: 1,
            orderBy: {
              base_price: 'asc'
            }
          }
        },
        orderBy: {
          id: 'asc'
        }
      });

      // Agregar el precio mínimo de las habitaciones al tipo
      return roomTypes.map(type => ({
        id: type.id,
        name: type.name,
        base_capacity: type.base_capacity,
        description: type.description,
        bed_configuration: type.bed_configuration,
        price: type.rooms[0]?.base_price || 0
      }));
    } catch (error) {
      console.error('❌ Error al obtener tipos de habitación:', error);
      return [];
    }
  }

  /**
   * Obtener habitaciones específicas disponibles por tipo
   */
  async getAvailableRoomsByType(roomTypeId, checkIn, checkOut, floor = null) {
    try {
      // Construir condiciones de búsqueda
      const whereConditions = {
        room_type_id: roomTypeId,
        is_active: true
      };

      // Si se especifica un piso, agregarlo a las condiciones
      if (floor !== null && floor !== undefined) {
        whereConditions.floor = floor;
      }

      // Obtener todas las habitaciones del tipo especificado (y piso si aplica)
      const allRooms = await prisma.rooms.findMany({
        where: whereConditions,
        select: {
          id: true,
          room_number: true,
          floor: true
        },
        orderBy: {
          room_number: 'asc'
        }
      });

      // Obtener habitaciones ocupadas en el rango de fechas
      const occupiedRooms = await prisma.reservation_rooms.findMany({
        where: {
          reservations: {
            check_in_date: { lt: new Date(checkOut) },
            check_out_date: { gt: new Date(checkIn) },
            status: {
              in: ['confirmed', 'in_progress', 'pending']
            }
          }
        },
        select: {
          room_id: true
        }
      });

      const occupiedIds = new Set(occupiedRooms.map(r => r.room_id));
      
      // Filtrar habitaciones disponibles
      const availableRooms = allRooms.filter(room => !occupiedIds.has(room.id));

      return availableRooms;
    } catch (error) {
      console.error('❌ Error al obtener habitaciones por tipo:', error);
      return [];
    }
  }

  /**
   * Obtener servicios activos desde la base de datos
   */
  async getActiveServices() {
    try {
      const services = await prisma.services.findMany({
        where: {
          is_active: true
        },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          unit: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      return services;
    } catch (error) {
      console.error('❌ Error al obtener servicios:', error);
      return [];
    }
  }

  /**
   * Obtener pisos disponibles con habitaciones activas
   */
  async getAvailableFloors(checkIn, checkOut) {
    try {
      // Obtener habitaciones disponibles en el rango de fechas
      const rooms = await prisma.rooms.findMany({
        where: {
          is_active: true,
          floor: {
            not: null
          }
        },
        select: {
          id: true,
          floor: true
        }
      });

      if (rooms.length === 0) {
        return [];
      }

      // Obtener habitaciones ocupadas
      const occupiedRoomIds = await prisma.reservation_rooms.findMany({
        where: {
          room_id: {
            in: rooms.map(r => r.id)
          },
          reservations: {
            status: {
              in: ['pending', 'confirmed', 'in_progress']
            },
            check_in_date: { lt: new Date(checkOut) },
            check_out_date: { gt: new Date(checkIn) }
          }
        },
        select: {
          room_id: true
        }
      });

      const occupiedIds = new Set(occupiedRoomIds.map(r => r.room_id));
      
      // Filtrar habitaciones disponibles y obtener pisos únicos
      const availableRooms = rooms.filter(r => !occupiedIds.has(r.id));
      const floors = [...new Set(availableRooms.map(r => r.floor))].sort((a, b) => a - b);

      return floors;
    } catch (error) {
      console.error('❌ Error al obtener pisos disponibles:', error);
      return [];
    }
  }

  /**
   * Obtener items de desayuno desde la base de datos
   */
  async getBreakfastMenuItems() {
    try {
      const items = await prisma.breakfast_menu_items.findMany({
        where: {
          is_active: true
        },
        select: {
          id: true,
          name: true,
          description: true,
          category: true
        },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' }
        ]
      });

      return items;
    } catch (error) {
      console.error('❌ Error al obtener items de desayuno:', error);
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
