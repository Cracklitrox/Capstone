const prisma = require('../db/prisma.client');
const { getIO } = require('../config/socket');
const redisSessionService = require('./redis.session.service');

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
    let session = await redisSessionService.getSession(phoneNumber);

    if (!session) {
      // Crear nueva sesión
      session = {
        phoneNumber,
        state: 'INITIAL',
        data: {},
        startedAt: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
        completed: false
      };

      await redisSessionService.setSession(phoneNumber, session);
      stats.totalConversations++;

      console.log(`✨ Nueva sesión creada para ${phoneNumber}`);
    } else {
      // Actualizar última actividad
      session.lastActivity = new Date();
      session.messageCount++;
      await redisSessionService.setSession(phoneNumber, session);
    }

    stats.messagesProcessed++;
    return session;
  }

  /**
   * Actualizar estado de la sesión
   */
  async updateSession(phoneNumber, updates) {
    const session = await redisSessionService.getSession(phoneNumber);
    if (session) {
      console.log(`[DEBUG updateSession] ANTES - Estado: ${session.state}`);
      console.log(`[DEBUG updateSession] Updates recibidos:`, JSON.stringify({
        state: updates.state,
        hasData: !!updates.data
      }));

      // Actualizar estado si viene en updates
      if (updates.state !== undefined) {
        session.state = updates.state;
      }

      // Actualizar data si viene en updates
      if (updates.data !== undefined) {
        session.data = updates.data;
      }

      // Actualizar otros campos
      const { state, data, ...otherUpdates } = updates;
      Object.assign(session, otherUpdates);

      await redisSessionService.setSession(phoneNumber, session);
      console.log(`[DEBUG updateSession] DESPUÉS - Estado: ${session.state}`);
    } else {
      console.log(`[DEBUG updateSession] ERROR - No se encontró sesión para ${phoneNumber}`);
    }
  }

  /**
   * Limpiar sesión completada
   */
  async clearSession(phoneNumber) {
    const session = await redisSessionService.getSession(phoneNumber);
    if (session?.completed) {
      stats.completedReservations++;
    }

    await redisSessionService.deleteSession(phoneNumber);
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

      // Verificar si ya existe una solicitud IDÉNTICA pendiente reciente (últimas 24 horas)
      // Solo bloqueamos si es la misma habitación con las mismas fechas
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);

      // Buscar todas las alertas pendientes recientes del mismo teléfono
      const existingAlerts = await prisma.alerts.findMany({
        where: {
          type: 'booking_request',
          status: 'pending',
          last_viewed_at: null, // Solo prevenir si no ha sido vista
          created_at: {
            gte: yesterday // Solo en las últimas 24 horas
          },
          full_summary: {
            path: ['guest_principal', 'phone'],
            equals: phoneNumber
          }
        }
      });

      // Verificar si alguna de las alertas existentes tiene la misma habitación y fechas
      const isDuplicate = existingAlerts.some(alert => {
        const summary = alert.full_summary;

        // Verificar si es la misma combinación de tipo de habitación, check-in y check-out
        const sameRoomType = summary?.reservation?.room_type_id === data.roomTypeId;
        const sameCheckIn = summary?.reservation?.check_in === (data.checkInDateFormatted || data.checkInDate);
        const sameCheckOut = summary?.reservation?.check_out === (data.checkOutDateFormatted || data.checkOutDate);

        return sameRoomType && sameCheckIn && sameCheckOut;
      });

      if (isDuplicate) {
        console.log(`⚠️ Ya existe una solicitud idéntica (misma habitación y fechas) para ${phoneNumber}`);
        throw new Error('DUPLICATE_REQUEST');
      }

      console.log(`✅ Permitiendo nueva reserva para ${phoneNumber} (habitación diferente o fechas diferentes)`);

      // Si hay alertas existentes pero son para habitaciones o fechas diferentes, mostrar info
      if (existingAlerts.length > 0) {
        console.log(`ℹ️ El cliente ${phoneNumber} tiene ${existingAlerts.length} solicitud(es) pendiente(s) adicional(es)`);
      }

      // Calcular costos para el resumen
      const nights = data.nights || 1;
      const roomPrice = data.roomInfo?.price || 0;
      const roomTotal = roomPrice * nights;

      let breakfastTotal = 0;
      if (data.services?.breakfast) {
        // Obtener precio del desayuno desde la base de datos
        const breakfastService = await prisma.services.findFirst({
          where: {
            name: {
              contains: 'Desayuno',
              mode: 'insensitive'
            },
            is_active: true
          },
          select: {
            price: true
          }
        });

        const breakfastQty = data.services.breakfastQuantity || 0;
        const breakfastPrice = breakfastService?.price || 3000; // Fallback a $3,000 si no se encuentra
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
        payment: {
          method: data.paymentMethod || 'efectivo',
          transfer_amount: data.transferAmount || null,
          transfer_option: data.transferOption || null
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
          detail: shortDetail,
          full_summary: fullSummary
        }
      });

      console.log(`✅ Alerta creada con ID: ${alert.id}`);

      // Notificar a recepcionistas Y administradores vía Socket.IO con resumen completo
      const io = getIO();
      if (io) {
        const alertData = {
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
        };

        // Emitir a recepcionistas
        io.to('role:receptionist').emit('alert:new', alertData);

        console.log('📢 Notificación enviada a recepcionistas con resumen completo');

        // Obtener el conteo actualizado de solicitudes WhatsApp pendientes NO VISTAS
        const pendingCount = await prisma.alerts.count({
          where: {
            type: 'booking_request',
            status: 'pending',
            last_viewed_at: null // Solo contar las no vistas
          }
        });

        // Emitir evento de actualización de contador WhatsApp solo a recepcionistas
        io.to('role:receptionist').emit('whatsapp:update', {
          count: pendingCount
        });

        console.log(`📊 Contador WhatsApp actualizado: ${pendingCount} solicitudes NO VISTAS (emitido a receptionist)`);
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
    const now = new Date();

    // Contar sesiones activas desde Redis
    const activeSessions = await redisSessionService.countActiveSessions();

    return {
      ...stats,
      activeSessions,
      uptime: Math.floor((now - stats.startTime) / 1000), // segundos
    };
  }

  /**
   * Limpiar todas las sesiones (para reinicio)
   */
  async clearAllSessions() {
    const count = await redisSessionService.countActiveSessions();
    await redisSessionService.clearAllSessions();
    console.log(`🗑️ ${count} sesiones limpiadas`);
    return count;
  }

  /**
   * Buscar huésped por RUT
   */
  async findGuestByRut(rut) {
    try {
      const guest = await prisma.users.findFirst({
        where: {
          identification_number: rut
        },
        include: {
          guest_details: true
        }
      });
      return guest;
    } catch (error) {
      console.error('Error al buscar huésped por RUT:', error);
      throw error;
    }
  }

  /**
   * Buscar huésped por Pasaporte
   */
  async findGuestByPassport(passport) {
    try {
      const guest = await prisma.users.findFirst({
        where: {
          identification_number: passport
        },
        include: {
          guest_details: true
        }
      });
      return guest;
    } catch (error) {
      console.error('Error al buscar huésped por Pasaporte:', error);
      throw error;
    }
  }

  /**
   * Actualizar datos personales de un huésped existente
   */
  async updateGuestPersonalData(guestId, data) {
    try {
      console.log(`[DEBUG] Actualizando datos del huésped ID: ${guestId}`);
      
      // Separar nombre completo en partes
      const nameParts = data.name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');
      
      // Actualizar usuario
      const updatedGuest = await prisma.users.update({
        where: { id: guestId },
        data: {
          first_name: firstName,
          paternal_last_name: lastName,
          email: data.email,
          phone_number: data.phone,
          birth_date: data.birthdate ? new Date(data.birthdate) : null,
          gender: data.gender,
          country: data.country,
          region: data.region,
          city: data.city,
          updated_at: new Date()
        }
      });
      
      console.log(`✅ Datos actualizados para huésped ID: ${guestId}`);
      return updatedGuest;
    } catch (error) {
      console.error('Error al actualizar datos del huésped:', error);
      throw error;
    }
  }

  /**
   * Convertir género de texto a enum de la base de datos
   */
  mapGenderToEnum(gender) {
    if (!gender) return null;
    
    const normalized = gender.toLowerCase();
    
    if (normalized.includes('hombre') || normalized.includes('masculino') || normalized === 'male') {
      return 'male';
    } else if (normalized.includes('mujer') || normalized.includes('femenino') || normalized === 'female') {
      return 'female';
    } else {
      return 'other';
    }
  }

  /**
   * Crear un nuevo huésped en la base de datos
   */
  async createNewGuest(data) {
    try {
      console.log(`[DEBUG] Creando nuevo huésped en la BD`);
      
      // Separar nombre completo en partes
      const nameParts = data.name.trim().split(' ');
      const firstName = nameParts[0];
      const paternalLastName = nameParts[1] || '';
      const maternalLastName = nameParts.slice(2).join(' ') || null;
      
      // Determinar el identification_number (RUT o Pasaporte)
      const identificationNumber = data.isChilean 
        ? (data.rut ? data.rut.replace(/\./g, '') : null)  // RUT sin puntos
        : (data.passport || null);  // Pasaporte
      
      // Formatear fecha de nacimiento
      let birthDate = null;
      if (data.birthdate) {
        // Si viene en formato DD/MM/YYYY, convertir a Date
        const parts = data.birthdate.split('/');
        if (parts.length === 3) {
          birthDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        } else {
          birthDate = new Date(data.birthdate);
        }
      }
      
      // Crear nuevo usuario y asignar rol en una transacción
      const newGuest = await prisma.$transaction(async (tx) => {
        const user = await tx.users.create({
          data: {
            identification_number: identificationNumber,
            first_name: firstName,
            paternal_last_name: paternalLastName,
            maternal_last_name: maternalLastName,
            email: data.email,
            phone_number: data.phone,
            birth_date: birthDate,
            gender: this.mapGenderToEnum(data.gender),
            country: data.country,
            region: data.region,
            city: data.city,
            password_hash: null, // NULL - no tiene contraseña
            can_login: false, // No puede iniciar sesión en el sistema
            status: 'active',
            is_fully_registered: false, // Registrado vía WhatsApp, no desde el sistema
            created_at: new Date(),
            updated_at: new Date()
          }
        });

        // Asignar rol de huésped (role_id = 3)
        await tx.user_roles.create({
          data: {
            user_id: user.id,
            role_id: 3 // ID del rol "guest"
          }
        });

        return user;
      });

      console.log(`✅ Nuevo huésped creado con ID: ${newGuest.id} - ${firstName} ${paternalLastName}`);
      return newGuest;
    } catch (error) {
      console.error('Error al crear nuevo huésped:', error);
      throw error;
    }
  }

  /**
   * Crear o actualizar huéspedes adicionales en la base de datos
   */
  async createOrUpdateAdditionalGuests(additionalGuests) {
    try {
      // Envolver todas las operaciones en una transacción
      const savedGuests = await prisma.$transaction(async (tx) => {
        const guests = [];

        for (const guest of additionalGuests) {
          // Saltar niños (no tienen datos completos)
          if (guest.isChild) {
            guests.push(null);
            continue;
          }

          // Verificar si ya existe por RUT o Pasaporte
          let existingGuest = null;
          if (guest.rut) {
            const normalizedRut = guest.rut.replace(/\./g, '');
            existingGuest = await tx.users.findFirst({
              where: { identification_number: normalizedRut }
            });
          } else if (guest.passport) {
            existingGuest = await tx.users.findFirst({
              where: { identification_number: guest.passport }
            });
          }

          if (existingGuest) {
            // Ya existe, no crear duplicado
            console.log(`ℹ️ Huésped adicional ya existe: ${existingGuest.first_name} ${existingGuest.paternal_last_name}`);
            guests.push(existingGuest);
          } else {
            // Crear nuevo huésped adicional si tiene datos mínimos
            if (guest.name && (guest.rut || guest.passport)) {
              const nameParts = guest.name.trim().split(' ');
              const firstName = nameParts[0];
              const paternalLastName = nameParts[1] || '';
              const maternalLastName = nameParts.slice(2).join(' ') || null;

              const identificationNumber = guest.rut
                ? guest.rut.replace(/\./g, '')
                : guest.passport;

              // Formatear fecha de nacimiento si existe
              let birthDate = null;
              if (guest.birthdate) {
                const parts = guest.birthdate.split('/');
                if (parts.length === 3) {
                  birthDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                } else {
                  birthDate = new Date(guest.birthdate);
                }
              }

              const newGuest = await tx.users.create({
                data: {
                  identification_number: identificationNumber,
                  first_name: firstName,
                  paternal_last_name: paternalLastName,
                  maternal_last_name: maternalLastName,
                  email: guest.email,
                  phone_number: guest.phone,
                  birth_date: birthDate,
                  gender: this.mapGenderToEnum(guest.gender),
                  country: guest.country,
                  region: guest.region,
                  city: guest.city,
                  password_hash: null, // NULL - no tiene contraseña
                  can_login: false, // No puede iniciar sesión en el sistema
                  status: 'active',
                  is_fully_registered: false, // Registrado vía WhatsApp
                  created_at: new Date(),
                  updated_at: new Date()
                }
              });

              // Asignar rol de huésped (role_id = 3)
              await tx.user_roles.create({
                data: {
                  user_id: newGuest.id,
                  role_id: 3 // ID del rol "guest"
                }
              });

              console.log(`✅ Huésped adicional creado: ${firstName} ${paternalLastName}`);
              guests.push(newGuest);
            } else {
              guests.push(null);
            }
          }
        }

        return guests;
      });

      return savedGuests;
    } catch (error) {
      console.error('Error al crear/actualizar huéspedes adicionales:', error);
      throw error;
    }
  }
}

module.exports = new WhatsAppService();
