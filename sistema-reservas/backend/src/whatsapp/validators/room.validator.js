/**
 * Validador de habitaciones para el chatbot de WhatsApp
 */

const whatsappService = require('../whatsapp.service');

/**
 * Tipos de habitación disponibles
 */
const ROOM_TYPES = {
  'standard': {
    name: 'Standard',
    emoji: '🛏️',
    capacity: '2 personas'
  },
  'double': {
    name: 'Doble',
    emoji: '🛏️🛏️',
    capacity: '2-4 personas'
  },
  'suite': {
    name: 'Suite',
    emoji: '👑',
    capacity: '2-4 personas'
  }
};

/**
 * Validar tipo de habitación seleccionado
 */
function validateRoomType(input) {
  const normalized = input.toLowerCase().trim();
  
  // Mapeo de posibles respuestas del usuario
  const typeMap = {
    '1': 'standard',
    'standard': 'standard',
    'estandar': 'standard',
    'estándar': 'standard',
    'simple': 'standard',
    
    '2': 'double',
    'double': 'double',
    'doble': 'double',
    'matrimonial': 'double',
    
    '3': 'suite',
    'suite': 'suite',
    'ejecutiva': 'suite',
    'premium': 'suite'
  };

  const roomType = typeMap[normalized];

  if (!roomType) {
    return {
      valid: false,
      message: '❌ Tipo de habitación no reconocido.\n\nResponde con:\n1️⃣ Standard\n2️⃣ Doble\n3️⃣ Suite\n\nO escribe el nombre del tipo.'
    };
  }

  return {
    valid: true,
    roomType: roomType,
    roomInfo: ROOM_TYPES[roomType]
  };
}

/**
 * Verificar disponibilidad de habitación
 */
async function checkAvailability(roomType, checkInDate, checkOutDate) {
  try {
    const availability = await whatsappService.checkRoomAvailability(
      roomType,
      checkInDate,
      checkOutDate
    );

    if (availability.error) {
      return {
        available: false,
        message: '❌ Error al verificar disponibilidad. Intenta más tarde.'
      };
    }

    if (!availability.available) {
      return {
        available: false,
        message: `❌ Lo sentimos, no hay habitaciones ${ROOM_TYPES[roomType].name} disponibles para esas fechas.\n\n¿Deseas ver otro tipo de habitación?`
      };
    }

    return {
      available: true,
      count: availability.count,
      message: `✅ Hay ${availability.count} habitación(es) ${ROOM_TYPES[roomType].name} disponible(s).`
    };
  } catch (error) {
    console.error('Error al verificar disponibilidad:', error);
    return {
      available: false,
      message: '❌ Error al verificar disponibilidad.'
    };
  }
}

/**
 * Obtener lista de tipos de habitación con formato
 */
function getRoomTypesMenu() {
  return `🏨 *Tipos de habitación disponibles:*

1️⃣ *Standard* 🛏️
   • Capacidad: 2 personas
   • Cama matrimonial
   • Baño privado

2️⃣ *Doble* 🛏️🛏️
   • Capacidad: 2-4 personas
   • 2 camas matrimoniales
   • Baño privado

3️⃣ *Suite* 👑
   • Capacidad: 2-4 personas
   • Cama King size
   • Sala de estar
   • Baño premium

Responde con el *número* o *nombre* del tipo que prefieres.`;
}

/**
 * Obtener información de un tipo de habitación específico
 */
function getRoomTypeInfo(roomType) {
  const info = ROOM_TYPES[roomType];
  if (!info) return null;

  return `${info.emoji} *Habitación ${info.name}*\nCapacidad: ${info.capacity}`;
}

/**
 * Validar combinación de habitación y número de huéspedes
 */
function validateRoomCapacity(roomType, adults, children) {
  const totalGuests = adults + children;
  
  const capacityLimits = {
    'standard': 2,
    'double': 4,
    'suite': 4
  };

  const maxCapacity = capacityLimits[roomType] || 2;

  if (totalGuests > maxCapacity) {
    return {
      valid: false,
      message: `❌ La habitación ${ROOM_TYPES[roomType].name} tiene capacidad máxima de ${maxCapacity} personas.\n\nTotal indicado: ${totalGuests} personas (${adults} adultos + ${children} niños).\n\nPor favor, ajusta el número de huéspedes o elige otro tipo de habitación.`
    };
  }

  return {
    valid: true
  };
}

module.exports = {
  ROOM_TYPES,
  validateRoomType,
  checkAvailability,
  getRoomTypesMenu,
  getRoomTypeInfo,
  validateRoomCapacity
};
