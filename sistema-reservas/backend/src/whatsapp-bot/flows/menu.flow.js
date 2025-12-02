/**
 * Menú principal del chatbot de WhatsApp
 */

import whatsappService from '../whatsapp.service.js';

/**
 * Obtener mensaje de bienvenida
 */
function getWelcomeMessage() {
  return `¡Hola! 👋 Bienvenido a *Hotel Don Teo*

Soy tu asistente virtual para reservas. 🏨

*Opciones disponibles:*

1️⃣ *Nueva Reserva*
   Hacer una nueva reserva

2️⃣ *Información*
   Conocer sobre el hotel

3️⃣ *Ayuda*
   Obtener ayuda

Escribe el *número* o *nombre* de la opción que deseas.`;
}

/**
 * Obtener información del hotel
 */
async function getHotelInfo() {
  try {
    // Obtener tipos de habitación desde la base de datos
    const roomTypes = await whatsappService.getRoomTypes();
    
    // Obtener servicios activos desde la base de datos
    const services = await whatsappService.getActiveServices();

    // Construir lista de habitaciones con mejor diseño
    let roomsList = '';
    if (roomTypes && roomTypes.length > 0) {
      roomsList = roomTypes.map((type, index) => {
        let info = `┌─ *${type.name}*\n`;
        if (type.base_capacity) {
          info += `│ 👥 Capacidad: ${type.base_capacity} persona(s)\n`;
        }
        if (type.price) {
          info += `│ 💰 Desde: $${type.price.toLocaleString()}\n`;
        }
        if (type.bed_configuration) {
          info += `│ 🛏️ ${type.bed_configuration}\n`;
        }
        if (type.description) {
          info += `│ 📝 ${type.description}\n`;
        }
        info += `└───────────────`;
        return info;
      }).join('\n\n');
    } else {
      roomsList = '• Consultar disponibilidad';
    }

    // Construir lista de servicios con mejor diseño
    let servicesList = '';
    if (services && services.length > 0) {
      servicesList = services.map(service => {
        let info = `┌─ *${service.name}*\n`;
        if (service.description) {
          info += `│ 📋 ${service.description}\n`;
        }
        info += `│ 💵 Precio: $${service.price.toLocaleString()}`;
        if (service.unit) {
          const unitMap = {
            'per_night': '/noche',
            'per_unit': '/unidad',
            'per_person': '/persona',
            'per_service': '/servicio'
          };
          info += ` ${unitMap[service.unit] || ''}`;
        }
        info += `\n└───────────────`;
        return info;
      }).join('\n\n');
    } else {
      servicesList = '• WiFi gratuito\n• Estacionamiento\n• Atención 24/7';
    }

    return `🏨 *HOTEL DON TEO*
═══════════════════════

📍 *UBICACIÓN*
Chile, Región de Los Lagos
Puerto Montt

🏢 *SOBRE NOSOTROS*
Hotel familiar con ambiente acogedor
y excelente servicio.

─────────────────────

🛏️ *HABITACIONES DISPONIBLES*

${roomsList}

─────────────────────

⭐ *SERVICIOS*

${servicesList}

─────────────────────

📞 *CONTACTO*
• WhatsApp: Este número
• Email: info@hoteldonleo.cl

═══════════════════════

¿Deseas hacer una *reserva*?
Escribe *MENU* para ver opciones.`;
  } catch (error) {
    return `🏨 *HOTEL DON TEO*
═══════════════════════

📍 *UBICACIÓN*
Chile, Región de Los Lagos, Puerto Montt

🏢 *SOBRE NOSOTROS*
Hotel familiar con ambiente acogedor
y excelente servicio.

⭐ *SERVICIOS*
• WiFi gratuito
• Desayuno buffet ($3,000/persona/noche)
• Estacionamiento
• Atención 24/7

📞 *CONTACTO*
• WhatsApp: Este número
• Email: info@hoteldonleo.cl

¿Deseas hacer una *reserva*?
Escribe *MENU* para ver opciones.`;
  }
}

/**
 * Obtener mensaje de ayuda
 */
function getHelpMessage() {
  return `❓ *Ayuda - ¿Cómo funciona?*

*Para hacer una reserva:*
1. Escribe *RESERVA* o elige opción 1
2. Te haré algunas preguntas
3. Confirma tus datos
4. ¡Listo! Recibirás confirmación

*Comandos disponibles:*
• *MENU* - Ver menú principal
• *RESERVA* - Iniciar reserva
• *INFO* - Información del hotel
• *VOLVER* - Retroceder un paso atras
• *CANCELAR* - Cancelar proceso actual

*Tips:*
• Responde con claridad
• Usa formato DD/MM/AAAA para fechas
• Si te equivocas, puedes escribir *Volver*

¿En qué más puedo ayudarte? Escribe *MENU* para volver al inicio.`;
}

/**
 * Procesar opción del menú
 */
function processMenuOption(input) {
  const normalized = input.toLowerCase().trim();
  
  // Mapeo de opciones
  const optionMap = {
    '1': 'reservation',
    'reserva': 'reservation',
    'nueva reserva': 'reservation',
    'hacer reserva': 'reservation',
    'booking': 'reservation',
    
    '2': 'info',
    'información': 'info',
    'informacion': 'info',
    'info': 'info',
    'sobre': 'info',
    
    '3': 'help',
    'ayuda': 'help',
    'help': 'help',
    'como': 'help',
    '¿cómo?': 'help'
  };

  const option = optionMap[normalized];

  if (!option) {
    return {
      valid: false,
      message: `❌ Opción no reconocida.

Por favor, elige una opción válida:
1️⃣ Nueva Reserva
2️⃣ Información
3️⃣ Ayuda

O escribe *MENU* para ver las opciones nuevamente.`
    };
  }

  return {
    valid: true,
    option: option
  };
}

/**
 * Verificar comandos globales
 */
function checkGlobalCommands(input) {
  const normalized = input.toLowerCase().trim();
  
  const commands = {
    'menu': 'menu',
    'menú': 'menu',
    'inicio': 'menu',
    'start': 'menu',
    
    'cancelar': 'cancel',
    'salir': 'cancel',
    'stop': 'cancel',
    'exit': 'cancel',
    
    'reserva': 'reservation',
    'nueva reserva': 'reservation',
    
    'info': 'info',
    'información': 'info',
    'informacion': 'info',
    
    'ayuda': 'help',
    'help': 'help'
  };

  return commands[normalized] || null;
}

/**
 * Mensaje de cancelación
 */
function getCancelMessage() {
  return `❌ *Proceso cancelado*

Tu reserva ha sido cancelada.

Si deseas iniciar nuevamente, escribe *MENU* o *RESERVA*.

¡Estamos aquí para ayudarte! 😊`;
}

/**
 * Mensaje de opción no válida
 */
function getInvalidOptionMessage() {
  return `❌ No entendí tu respuesta.

Escribe *MENU* para ver las opciones disponibles.`;
}

export default {
  getWelcomeMessage,
  getHotelInfo,
  getHelpMessage,
  processMenuOption,
  checkGlobalCommands,
  getCancelMessage,
  getInvalidOptionMessage
};
