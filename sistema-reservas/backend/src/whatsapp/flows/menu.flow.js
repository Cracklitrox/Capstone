/**
 * Menú principal del chatbot de WhatsApp
 */

const whatsappService = require('../whatsapp.service');

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
    
    let roomsList = '';
    if (roomTypes && roomTypes.length > 0) {
      roomsList = roomTypes.map(type => {
        let info = `• *${type.name}*`;
        if (type.base_capacity) {
          info += ` - Capacidad: ${type.base_capacity} persona(s)`;
        }
        if (type.price) {
          info += ` - Desde $${type.price.toLocaleString()}`;
        }
        if (type.description) {
          info += `\n  ${type.description}`;
        }
        return info;
      }).join('\n');
    } else {
      roomsList = '• Consultar disponibilidad';
    }

    return `🏨 *Hotel Don Teo*

📍 *Ubicación:*
Chile, región de Los Lagos, Puerto Montt

🏢 *Sobre nosotros:*
Hotel familiar con ambiente acogedor y excelente servicio.

🛏️ *Habitaciones:*
${roomsList}

⭐ *Servicios:*
• WiFi gratuito
• Desayuno buffet ($3,000 por persona/noche)
• Estacionamiento
• Atención 24/7

📞 *Contacto:*
• WhatsApp: Este número
• Email: info@hoteldonleo.cl

¿Deseas hacer una *reserva*? Escribe *MENU* para ver las opciones.`;
  } catch (error) {
    console.error('Error al obtener información del hotel:', error);
    return `🏨 *Hotel Don Teo*

📍 *Ubicación:*
Chile, región de Los Lagos, Puerto Montt

🏢 *Sobre nosotros:*
Hotel familiar con ambiente acogedor y excelente servicio.

⭐ *Servicios:*
• WiFi gratuito
• Desayuno buffet ($3,000 por persona/noche)
• Estacionamiento
• Atención 24/7

📞 *Contacto:*
• WhatsApp: Este número
• Email: info@hoteldonleo.cl

¿Deseas hacer una *reserva*? Escribe *MENU* para ver las opciones.`;
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

module.exports = {
  getWelcomeMessage,
  getHotelInfo,
  getHelpMessage,
  processMenuOption,
  checkGlobalCommands,
  getCancelMessage,
  getInvalidOptionMessage
};
