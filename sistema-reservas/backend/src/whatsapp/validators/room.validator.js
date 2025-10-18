/**
 * Validador de habitaciones para el chatbot de WhatsApp
 */

const whatsappService = require('../whatsapp.service');

/**
 * Obtener menú de tipos de habitación desde la BD
 */
async function getRoomTypesMenu() {
  try {
    const roomTypes = await whatsappService.getRoomTypes();
    
    if (roomTypes.length === 0) {
      return '❌ No hay tipos de habitación disponibles en este momento.';
    }

    let menu = '🏨 *Tipos de habitación disponibles:*\n\n';
    
    roomTypes.forEach((type, index) => {
      const number = index + 1;
      menu += `${number}️⃣ *${type.name}*\n`;
      menu += `   Capacidad: ${type.base_capacity} persona(s)\n`;
      if (type.bed_configuration) {
        menu += `   Camas: ${type.bed_configuration}\n`;
      }
      if (type.description) {
        menu += `   ${type.description}\n`;
      }
      menu += '\n';
    });

    menu += 'Responde con:\n';
    roomTypes.forEach((type, index) => {
      menu += `${index + 1} - ${type.name}\n`;
    });
    menu += '\nO escribe el nombre del tipo de habitación.';

    return menu;
  } catch (error) {
    console.error('Error al obtener tipos de habitación:', error);
    return '❌ Error al cargar tipos de habitación. Intenta más tarde.';
  }
}

/**
 * Validar tipo de habitación seleccionado
 */
async function validateRoomType(input) {
  try {
    const roomTypes = await whatsappService.getRoomTypes();
    
    if (roomTypes.length === 0) {
      return {
        valid: false,
        message: '❌ No hay tipos de habitación disponibles.'
      };
    }

    const normalized = input.toLowerCase().trim();
    
    // Primero intentar por número (1, 2, 3...)
    const numberInput = parseInt(normalized);
    if (!isNaN(numberInput) && numberInput > 0 && numberInput <= roomTypes.length) {
      const selectedType = roomTypes[numberInput - 1];
      return {
        valid: true,
        roomTypeId: selectedType.id,
        roomTypeName: selectedType.name,
        roomInfo: {
          name: selectedType.name,
          capacity: selectedType.base_capacity,
          description: selectedType.description,
          bedConfiguration: selectedType.bed_configuration
        }
      };
    }

    // Intentar por nombre
    const matchedType = roomTypes.find(type => 
      type.name.toLowerCase() === normalized ||
      type.name.toLowerCase().includes(normalized) ||
      normalized.includes(type.name.toLowerCase())
    );

    if (matchedType) {
      return {
        valid: true,
        roomTypeId: matchedType.id,
        roomTypeName: matchedType.name,
        roomInfo: {
          name: matchedType.name,
          capacity: matchedType.base_capacity,
          description: matchedType.description,
          bedConfiguration: matchedType.bed_configuration
        }
      };
    }

    return {
      valid: false,
      message: `❌ Tipo de habitación no reconocido.\n\n${await getRoomTypesMenu()}`
    };
  } catch (error) {
    console.error('Error al validar tipo de habitación:', error);
    return {
      valid: false,
      message: '❌ Error al validar tipo de habitación. Intenta más tarde.'
    };
  }
}

/**
 * Verificar disponibilidad de habitación
 */
async function checkAvailability(roomTypeId, checkInDate, checkOutDate) {
  try {
    const availability = await whatsappService.checkRoomAvailability(
      roomTypeId,
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
        message: `❌ Lo sentimos, no hay habitaciones tipo *${availability.roomTypeName || 'seleccionado'}* disponibles para esas fechas.\n\n${await getRoomTypesMenu()}`
      };
    }

    return {
      available: true,
      count: availability.count,
      message: `✅ Hay ${availability.count} habitación(es) tipo *${availability.roomTypeName}* disponible(s).`
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
 * Validar combinación de habitación y número de huéspedes
 */
async function validateRoomCapacity(roomTypeId, adults, children) {
  try {
    const roomTypes = await whatsappService.getRoomTypes();
    const roomType = roomTypes.find(type => type.id === roomTypeId);
    
    if (!roomType) {
      return {
        valid: false,
        message: '❌ Tipo de habitación no encontrado.'
      };
    }

    const totalGuests = adults + children;
    const maxCapacity = roomType.base_capacity;

    if (totalGuests > maxCapacity) {
      return {
        valid: false,
        message: `❌ La habitación *${roomType.name}* tiene capacidad máxima de ${maxCapacity} persona(s).\n\nTotal indicado: ${totalGuests} personas (${adults} adultos + ${children} niños).\n\nPor favor, ajusta el número de huéspedes o elige otro tipo de habitación.`
      };
    }

    return {
      valid: true
    };
  } catch (error) {
    console.error('Error al validar capacidad:', error);
    return {
      valid: true // Permitir continuar si hay error
    };
  }
}

module.exports = {
  validateRoomType,
  checkAvailability,
  getRoomTypesMenu,
  validateRoomCapacity
};
