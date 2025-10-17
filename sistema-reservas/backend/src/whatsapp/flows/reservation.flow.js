/**
 * Flujo de conversación para reservas del chatbot de WhatsApp
 */

const whatsappService = require('../whatsapp.service');
const dateValidator = require('../validators/date.validator');
const guestValidator = require('../validators/guest.validator');
const roomValidator = require('../validators/room.validator');
const menuFlow = require('./menu.flow');

/**
 * Estados del flujo de reserva
 */
const STATES = {
  INITIAL: 'INITIAL',
  AWAITING_NAME: 'AWAITING_NAME',
  AWAITING_RUT: 'AWAITING_RUT',
  AWAITING_EMAIL: 'AWAITING_EMAIL',
  AWAITING_PHONE: 'AWAITING_PHONE',
  AWAITING_CHECK_IN: 'AWAITING_CHECK_IN',
  AWAITING_CHECK_OUT: 'AWAITING_CHECK_OUT',
  AWAITING_ROOM_TYPE: 'AWAITING_ROOM_TYPE',
  AWAITING_ADULTS: 'AWAITING_ADULTS',
  AWAITING_CHILDREN: 'AWAITING_CHILDREN',
  AWAITING_SPECIAL_REQUESTS: 'AWAITING_SPECIAL_REQUESTS',
  AWAITING_CONFIRMATION: 'AWAITING_CONFIRMATION'
};

/**
 * Procesar mensaje según el estado actual
 */
async function processMessage(session, messageText, phoneNumber) {
  try {
    // Verificar comandos globales primero
    const globalCommand = menuFlow.checkGlobalCommands(messageText);
    
    if (globalCommand === 'menu') {
      whatsappService.updateSession(phoneNumber, { state: STATES.INITIAL });
      return menuFlow.getWelcomeMessage();
    }
    
    if (globalCommand === 'cancel') {
      whatsappService.updateSession(phoneNumber, { 
        state: STATES.INITIAL,
        data: {}
      });
      return menuFlow.getCancelMessage();
    }

    // Procesar según estado
    switch (session.state) {
      case STATES.INITIAL:
        return await handleInitialState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_NAME:
        return await handleNameState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_RUT:
        return await handleRutState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_EMAIL:
        return await handleEmailState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_PHONE:
        return await handlePhoneState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_CHECK_IN:
        return await handleCheckInState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_CHECK_OUT:
        return await handleCheckOutState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_ROOM_TYPE:
        return await handleRoomTypeState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_ADULTS:
        return await handleAdultsState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_CHILDREN:
        return await handleChildrenState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_SPECIAL_REQUESTS:
        return await handleSpecialRequestsState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_CONFIRMATION:
        return await handleConfirmationState(session, messageText, phoneNumber);
      
      default:
        return menuFlow.getWelcomeMessage();
    }
  } catch (error) {
    console.error('Error en processMessage:', error);
    return '❌ Ha ocurrido un error. Por favor, intenta nuevamente o escribe *MENU*.';
  }
}

/**
 * Estado inicial - Menú principal
 */
async function handleInitialState(session, messageText, phoneNumber) {
  const menuOption = menuFlow.processMenuOption(messageText);
  
  if (!menuOption.valid) {
    return menuFlow.getWelcomeMessage();
  }

  if (menuOption.option === 'info') {
    return menuFlow.getHotelInfo();
  }

  if (menuOption.option === 'help') {
    return menuFlow.getHelpMessage();
  }

  if (menuOption.option === 'reservation') {
    whatsappService.updateSession(phoneNumber, { 
      state: STATES.AWAITING_NAME 
    });
    
    return `🎉 *¡Genial! Iniciemos tu reserva*

Para comenzar, necesito algunos datos.

📝 *Paso 1 de 9*
¿Cuál es tu *nombre completo*?`;
  }

  return menuFlow.getWelcomeMessage();
}

/**
 * Capturar nombre
 */
async function handleNameState(session, messageText, phoneNumber) {
  const validation = guestValidator.validateName(messageText);
  
  if (!validation.valid) {
    return validation.message;
  }

  session.data.name = validation.name;
  whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_RUT,
    data: session.data
  });

  return `✅ Perfecto, ${validation.name}

📝 *Paso 2 de 9*
¿Cuál es tu *RUT*?

Formato: 12.345.678-9`;
}

/**
 * Capturar RUT
 */
async function handleRutState(session, messageText, phoneNumber) {
  const validation = guestValidator.validateRut(messageText);
  
  if (!validation.valid) {
    return validation.message;
  }

  session.data.rut = validation.rut;
  whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_EMAIL,
    data: session.data
  });

  return `✅ RUT registrado: ${validation.rut}

📝 *Paso 3 de 9*
¿Cuál es tu *correo electrónico*?`;
}

/**
 * Capturar email
 */
async function handleEmailState(session, messageText, phoneNumber) {
  const validation = guestValidator.validateEmail(messageText);
  
  if (!validation.valid) {
    return validation.message;
  }

  session.data.email = validation.email;
  whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_PHONE,
    data: session.data
  });

  return `✅ Email registrado

📝 *Paso 4 de 9*
¿Cuál es tu *número de teléfono* de contacto?

Formato: +56912345678`;
}

/**
 * Capturar teléfono
 */
async function handlePhoneState(session, messageText, phoneNumber) {
  const validation = guestValidator.validatePhone(messageText);
  
  if (!validation.valid) {
    return validation.message;
  }

  session.data.phone = validation.phone;
  whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_CHECK_IN,
    data: session.data
  });

  return `✅ Teléfono registrado

📝 *Paso 5 de 9*
¿Cuál es la fecha de *entrada* (check-in)?

Formato: DD/MM/AAAA
Ejemplo: 25/12/2025`;
}

/**
 * Capturar fecha de check-in
 */
async function handleCheckInState(session, messageText, phoneNumber) {
  const validation = dateValidator.validateCheckInDate(messageText);
  
  if (!validation.valid) {
    return validation.message;
  }

  session.data.checkInDate = dateValidator.formatDateForDB(validation.date);
  session.data.checkInDateFormatted = validation.formatted;
  
  whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_CHECK_OUT,
    data: session.data
  });

  return `✅ Fecha de entrada: ${validation.formatted}

📝 *Paso 6 de 9*
¿Cuál es la fecha de *salida* (check-out)?

Formato: DD/MM/AAAA`;
}

/**
 * Capturar fecha de check-out
 */
async function handleCheckOutState(session, messageText, phoneNumber) {
  const checkInDate = dateValidator.parseDate(session.data.checkInDateFormatted);
  const validation = dateValidator.validateCheckOutDate(messageText, checkInDate);
  
  if (!validation.valid) {
    return validation.message;
  }

  session.data.checkOutDate = dateValidator.formatDateForDB(validation.date);
  session.data.checkOutDateFormatted = validation.formatted;
  session.data.nights = validation.nights;
  
  whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_ROOM_TYPE,
    data: session.data
  });

  return `✅ Fecha de salida: ${validation.formatted}
🌙 Total: ${validation.nights} noche(s)

📝 *Paso 7 de 9*
${roomValidator.getRoomTypesMenu()}`;
}

/**
 * Capturar tipo de habitación
 */
async function handleRoomTypeState(session, messageText, phoneNumber) {
  const validation = roomValidator.validateRoomType(messageText);
  
  if (!validation.valid) {
    return validation.message;
  }

  // Verificar disponibilidad
  const availability = await roomValidator.checkAvailability(
    validation.roomType,
    session.data.checkInDate,
    session.data.checkOutDate
  );

  if (!availability.available) {
    return availability.message + '\n\n' + roomValidator.getRoomTypesMenu();
  }

  session.data.roomType = validation.roomType;
  session.data.roomInfo = validation.roomInfo;
  
  whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_ADULTS,
    data: session.data
  });

  return `✅ Habitación seleccionada: ${validation.roomInfo.name} ${validation.roomInfo.emoji}

📝 *Paso 8 de 9*
¿Cuántos *adultos* se hospedarán?

(Número entre 1 y 4)`;
}

/**
 * Capturar cantidad de adultos
 */
async function handleAdultsState(session, messageText, phoneNumber) {
  const validation = guestValidator.validateGuestCount(messageText, 'adults');
  
  if (!validation.valid) {
    return validation.message;
  }

  session.data.adults = validation.count;
  
  whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_CHILDREN,
    data: session.data
  });

  return `✅ Adultos: ${validation.count}

📝 *Paso 9 de 9*
¿Cuántos *niños* se hospedarán?

(Número entre 0 y 3, o escribe *0* si no hay niños)`;
}

/**
 * Capturar cantidad de niños
 */
async function handleChildrenState(session, messageText, phoneNumber) {
  const validation = guestValidator.validateGuestCount(messageText, 'children');
  
  if (!validation.valid) {
    return validation.message;
  }

  session.data.children = validation.count;

  // Validar capacidad de la habitación
  const capacityValidation = roomValidator.validateRoomCapacity(
    session.data.roomType,
    session.data.adults,
    session.data.children
  );

  if (!capacityValidation.valid) {
    // Volver al estado de adultos para que reingrese
    whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_ADULTS
    });
    return capacityValidation.message;
  }
  
  whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_SPECIAL_REQUESTS,
    data: session.data
  });

  return `✅ Niños: ${validation.count}

📝 *Último paso (opcional)*
¿Tienes alguna *solicitud especial*?

Ejemplo: Vista al mar, piso alto, cama extra, etc.

Si no tienes solicitudes, escribe *NO* o *NINGUNA*.`;
}

/**
 * Capturar solicitudes especiales
 */
async function handleSpecialRequestsState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  if (normalized === 'no' || normalized === 'ninguna' || normalized === 'ninguno') {
    session.data.specialRequests = '';
  } else {
    const validation = guestValidator.validateSpecialRequests(messageText);
    
    if (!validation.valid) {
      return validation.message;
    }
    
    session.data.specialRequests = validation.requests;
  }
  
  whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_CONFIRMATION,
    data: session.data
  });

  return getConfirmationMessage(session.data);
}

/**
 * Confirmar datos
 */
async function handleConfirmationState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  if (normalized === 'si' || normalized === 'sí' || normalized === 'confirmar' || normalized === '1') {
    // Marcar sesión como completada
    whatsappService.updateSession(phoneNumber, {
      completed: true
    });
    
    return null; // El controller enviará el mensaje de confirmación
  }
  
  if (normalized === 'no' || normalized === 'cancelar' || normalized === '2') {
    whatsappService.updateSession(phoneNumber, {
      state: STATES.INITIAL,
      data: {}
    });
    
    return menuFlow.getCancelMessage();
  }
  
  return `Por favor, responde:
• *SÍ* o *1* para confirmar
• *NO* o *2* para cancelar`;
}

/**
 * Generar mensaje de confirmación
 */
function getConfirmationMessage(data) {
  const specialRequests = data.specialRequests 
    ? `\n   ${data.specialRequests}` 
    : '\n   Ninguna';

  return `📋 *Resumen de tu reserva*

👤 *Datos personales:*
   • Nombre: ${data.name}
   • RUT: ${data.rut}
   • Email: ${data.email}
   • Teléfono: ${data.phone}

🏨 *Detalles de la reserva:*
   • Entrada: ${data.checkInDateFormatted}
   • Salida: ${data.checkOutDateFormatted}
   • Noches: ${data.nights}
   • Habitación: ${data.roomInfo.name} ${data.roomInfo.emoji}
   • Adultos: ${data.adults}
   • Niños: ${data.children}

📝 *Solicitudes especiales:*${specialRequests}

---

¿Los datos son correctos?

1️⃣ *SÍ* - Enviar solicitud
2️⃣ *NO* - Cancelar y reiniciar`;
}

module.exports = {
  STATES,
  processMessage
};
