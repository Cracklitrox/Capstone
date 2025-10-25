/**
 * Flujo de conversación para reservas del chatbot de WhatsApp
 */

const whatsappService = require('../whatsapp.service');
const dateValidator = require('../validators/date.validator');
const guestValidator = require('../validators/guest.validator');
const roomValidator = require('../validators/room.validator');
const menuFlow = require('./menu.flow');

/**
 * Estados del flujo de reserva (mismo orden que la interfaz)
 * Paso 1: Fechas y Huéspedes
 * Paso 2: Habitaciones
 * Paso 3: Datos del Huésped Principal
 * Paso 4: Servicios Adicionales (opcional)
 * Paso 5: Huéspedes Adicionales (opcional)
 * Paso 6: Confirmación
 */
const STATES = {
  INITIAL: 'INITIAL',
  // Paso 1: Búsqueda (Fechas y Huéspedes)
  AWAITING_CHECK_IN: 'AWAITING_CHECK_IN',
  AWAITING_CHECK_OUT: 'AWAITING_CHECK_OUT',
  AWAITING_ADULTS: 'AWAITING_ADULTS',
  AWAITING_HAS_CHILDREN: 'AWAITING_HAS_CHILDREN',
  AWAITING_CHILDREN: 'AWAITING_CHILDREN',
  AWAITING_FLOOR: 'AWAITING_FLOOR',
  // Paso 2: Selección de Habitaciones
  AWAITING_ROOM_TYPE: 'AWAITING_ROOM_TYPE',
  AWAITING_SPECIFIC_ROOM: 'AWAITING_SPECIFIC_ROOM',
  // Paso 3: Datos del Huésped Principal
  AWAITING_NAME: 'AWAITING_NAME',
  AWAITING_RUT: 'AWAITING_RUT',
  AWAITING_EMAIL: 'AWAITING_EMAIL',
  AWAITING_PHONE: 'AWAITING_PHONE',
  AWAITING_SPECIAL_REQUESTS: 'AWAITING_SPECIAL_REQUESTS',
  // Paso 4: Servicios Adicionales (opcional)
  AWAITING_SERVICES: 'AWAITING_SERVICES',
  AWAITING_LAUNDRY: 'AWAITING_LAUNDRY',
  AWAITING_BREAKFAST: 'AWAITING_BREAKFAST',
  AWAITING_BREAKFAST_PREFERENCE: 'AWAITING_BREAKFAST_PREFERENCE',
  // Paso 5: Huéspedes Adicionales (opcional)
  AWAITING_ADDITIONAL_GUESTS_CHOICE: 'AWAITING_ADDITIONAL_GUESTS_CHOICE',
  AWAITING_ADDITIONAL_GUEST_NAME: 'AWAITING_ADDITIONAL_GUEST_NAME',
  AWAITING_ADDITIONAL_GUEST_RUT: 'AWAITING_ADDITIONAL_GUEST_RUT',
  AWAITING_ADDITIONAL_GUEST_EMAIL: 'AWAITING_ADDITIONAL_GUEST_EMAIL',
  AWAITING_ADDITIONAL_GUEST_PHONE: 'AWAITING_ADDITIONAL_GUEST_PHONE',
  AWAITING_MORE_GUESTS: 'AWAITING_MORE_GUESTS',
  // Paso 6: Confirmación
  AWAITING_CONFIRMATION: 'AWAITING_CONFIRMATION'
};

/**
 * Mapa de navegación hacia atrás
 */
const PREVIOUS_STATE = {
  [STATES.AWAITING_CHECK_OUT]: STATES.AWAITING_CHECK_IN,
  [STATES.AWAITING_ADULTS]: STATES.AWAITING_CHECK_OUT,
  [STATES.AWAITING_HAS_CHILDREN]: STATES.AWAITING_ADULTS,
  [STATES.AWAITING_CHILDREN]: STATES.AWAITING_HAS_CHILDREN,
  [STATES.AWAITING_FLOOR]: STATES.AWAITING_HAS_CHILDREN,
  [STATES.AWAITING_ROOM_TYPE]: STATES.AWAITING_FLOOR,
  [STATES.AWAITING_SPECIFIC_ROOM]: STATES.AWAITING_ROOM_TYPE,
  [STATES.AWAITING_NAME]: STATES.AWAITING_SPECIFIC_ROOM,
  [STATES.AWAITING_RUT]: STATES.AWAITING_NAME,
  [STATES.AWAITING_EMAIL]: STATES.AWAITING_RUT,
  [STATES.AWAITING_PHONE]: STATES.AWAITING_EMAIL,
  [STATES.AWAITING_SPECIAL_REQUESTS]: STATES.AWAITING_PHONE,
  [STATES.AWAITING_SERVICES]: STATES.AWAITING_SPECIAL_REQUESTS,
  [STATES.AWAITING_LAUNDRY]: STATES.AWAITING_SERVICES,
  [STATES.AWAITING_BREAKFAST]: STATES.AWAITING_SERVICES,
  [STATES.AWAITING_BREAKFAST_PREFERENCE]: STATES.AWAITING_BREAKFAST,
  [STATES.AWAITING_ADDITIONAL_GUESTS_CHOICE]: STATES.AWAITING_SERVICES,
  [STATES.AWAITING_ADDITIONAL_GUEST_NAME]: STATES.AWAITING_ADDITIONAL_GUESTS_CHOICE,
  [STATES.AWAITING_ADDITIONAL_GUEST_RUT]: STATES.AWAITING_ADDITIONAL_GUEST_NAME,
  [STATES.AWAITING_ADDITIONAL_GUEST_EMAIL]: STATES.AWAITING_ADDITIONAL_GUEST_RUT,
  [STATES.AWAITING_ADDITIONAL_GUEST_PHONE]: STATES.AWAITING_ADDITIONAL_GUEST_EMAIL,
  [STATES.AWAITING_MORE_GUESTS]: STATES.AWAITING_ADDITIONAL_GUEST_PHONE,
  [STATES.AWAITING_CONFIRMATION]: STATES.AWAITING_MORE_GUESTS
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
    
    // Comando VOLVER/ATRAS
    const normalized = messageText.toLowerCase().trim();
    if ((normalized === 'volver' || normalized === 'atras' || normalized === 'atrás') && session.state !== STATES.INITIAL) {
      return await handleGoBack(session, phoneNumber);
    }

    // Procesar según estado (orden ajustado a la interfaz)
    switch (session.state) {
      case STATES.INITIAL:
        return await handleInitialState(session, messageText, phoneNumber);
      
      // Paso 1: Fechas y Huéspedes
      case STATES.AWAITING_CHECK_IN:
        return await handleCheckInState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_CHECK_OUT:
        return await handleCheckOutState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_ADULTS:
        return await handleAdultsState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_HAS_CHILDREN:
        return await handleHasChildrenState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_CHILDREN:
        return await handleChildrenState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_FLOOR:
        return await handleFloorState(session, messageText, phoneNumber);
      
      // Paso 2: Selección de Habitaciones
      case STATES.AWAITING_ROOM_TYPE:
        return await handleRoomTypeState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_SPECIFIC_ROOM:
        return await handleSpecificRoomState(session, messageText, phoneNumber);
      
      // Paso 3: Datos del Huésped Principal
      case STATES.AWAITING_NAME:
        return await handleNameState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_RUT:
        return await handleRutState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_EMAIL:
        return await handleEmailState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_PHONE:
        return await handlePhoneState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_SPECIAL_REQUESTS:
        return await handleSpecialRequestsState(session, messageText, phoneNumber);
      
      // Paso 4: Servicios Adicionales (opcional)
      case STATES.AWAITING_SERVICES:
        return await handleServicesState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_LAUNDRY:
        return await handleLaundryState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_BREAKFAST:
        return await handleBreakfastState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_BREAKFAST_PREFERENCE:
        return await handleBreakfastPreferenceState(session, messageText, phoneNumber);
      
      // Paso 5: Huéspedes Adicionales (opcional)
      case STATES.AWAITING_ADDITIONAL_GUESTS_CHOICE:
        return await handleAdditionalGuestsChoiceState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_ADDITIONAL_GUEST_NAME:
        return await handleAdditionalGuestNameState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_ADDITIONAL_GUEST_RUT:
        return await handleAdditionalGuestRutState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_ADDITIONAL_GUEST_EMAIL:
        return await handleAdditionalGuestEmailState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_ADDITIONAL_GUEST_PHONE:
        return await handleAdditionalGuestPhoneState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_MORE_GUESTS:
        return await handleMoreGuestsState(session, messageText, phoneNumber);
      
      // Paso 6: Confirmación
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
 * Manejar comando VOLVER/ATRAS
 */
async function handleGoBack(session, phoneNumber) {
  const previousState = PREVIOUS_STATE[session.state];
  
  if (!previousState) {
    return `ℹ️ No puedes volver desde este punto.

Escribe *MENU* para volver al inicio o *CANCELAR* para reiniciar.`;
  }
  
  whatsappService.updateSession(phoneNumber, {
    state: previousState,
    data: session.data
  });
  
  return `⬅️ Volviendo al paso anterior...

${await getStatePrompt(previousState, session.data)}`;
}

/**
 * Obtener mensaje del estado para navegación hacia atrás
 */
async function getStatePrompt(state, data) {
  switch (state) {
    case STATES.AWAITING_CHECK_IN:
      return `📅 *Paso 1: Fechas y Huéspedes*\n\n¿Cuál es la fecha de *entrada* (check-in)?\n\nFormato: DD/MM/AAAA\nEjemplo: 25/12/2025`;
    case STATES.AWAITING_CHECK_OUT:
      return `📅 ¿Cuál es la fecha de *salida* (check-out)?\n\nFormato: DD/MM/AAAA`;
    case STATES.AWAITING_ADULTS:
      return `👥 ¿Cuántos *adultos* se hospedarán?\n\nIngresa un número (1-10)\nNota: Niños de 5 años o más se consideran adultos.`;
    case STATES.AWAITING_CHILDREN:
      return `👶 ¿Cuántos *niños menores de 4 años*?\n\nIngresa un número (0-5)\n⚠️ Los niños menores de 4 años NO pagan.`;
    case STATES.AWAITING_FLOOR:
      // Regenerar menú de pisos
      if (data && data.checkInDate && data.checkOutDate) {
        const whatsappService = require('../whatsapp.service');
        const availableFloors = await whatsappService.getAvailableFloors(
          data.checkInDate,
          data.checkOutDate
        );
        const floorMenu = availableFloors.map((floor, index) => {
          const floorName = floor === 0 ? 'Planta baja' : `Piso ${floor}`;
          return `${index + 1}. ${floorName}`;
        }).join('\n');
        return `🏢 *Paso 2: Selección de Piso*\n\n${floorMenu}\n\nSelecciona el número del piso donde deseas hospedarte.`;
      }
      return `🏢 *Paso 2: Selección de Piso*\n\nSelecciona el piso donde deseas hospedarte.`;
    case STATES.AWAITING_ROOM_TYPE:
      return `🏨 *Paso 3: Selección de Tipo de Habitación*\n\n${await roomValidator.getRoomTypesMenu()}`;
    case STATES.AWAITING_NAME:
      return `📝 *Paso 3: Datos del Huésped Principal*\n\n¿Cuál es tu *nombre completo*?`;
    case STATES.AWAITING_RUT:
      return `📝 ¿Cuál es tu *RUT*?\n\nFormato: 11.111.111-1`;
    case STATES.AWAITING_EMAIL:
      return `📧 ¿Cuál es tu *correo electrónico*?`;
    case STATES.AWAITING_PHONE:
      return `📱 ¿Cuál es tu *número de teléfono* de contacto?\n\nFormato: +56912345678`;
    case STATES.AWAITING_SPECIAL_REQUESTS:
      return `💬 ¿Tienes alguna *solicitud especial*?\n\nEjemplos: Vista al mar, Piso alto/bajo, Cama adicional\n\nEscribe tu solicitud o *NO* si no tienes ninguna.`;
    case STATES.AWAITING_SERVICES:
      return `🛎️ *Paso 4: Servicios Adicionales (Opcional)*\n\n¿Deseas agregar servicios adicionales?\n\n1️⃣ Lavandería\n2️⃣ Desayuno\n3️⃣ Ambos servicios\n4️⃣ NO, continuar sin servicios`;
    default:
      return `Continuemos con tu reserva...`;
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
      state: STATES.AWAITING_CHECK_IN 
    });
    
    return `🎉 *¡Genial! Iniciemos tu reserva*

📅 *Paso 1: Fechas y Huéspedes*

¿Cuál es tu fecha de *check-in* (entrada)?

Formato: DD/MM/YYYY
Ejemplo: 25/10/2025

💡 *Tip:* Escribe *VOLVER* en cualquier momento para regresar al paso anterior.`;
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

📝 ¿Cuál es tu *RUT*?

Formato: 11.111.111-1`;
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

📝 ¿Cuál es tu *correo electrónico*?`;
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

📝 ¿Cuál es tu *número de teléfono* de contacto?

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
    state: STATES.AWAITING_SPECIAL_REQUESTS,
    data: session.data
  });

  return `✅ Teléfono registrado

📝 *Paso Final (Opcional)*
¿Tienes alguna *solicitud especial*?

Ejemplos:
- Vista al mar
- Piso alto/bajo
- Cama adicional
- Alergias alimentarias

Escribe tu solicitud o *NO* si no tienes ninguna.`;
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

📝 ¿Cuál es la fecha de *salida* (check-out)?

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
    state: STATES.AWAITING_ADULTS,
    data: session.data
  });

  return `✅ Fecha de salida: ${validation.formatted}
🌙 Total: ${validation.nights} noche(s)

👥 ¿Cuántos *adultos* se hospedarán?

Ingresa un número (1-10)
Nota: Niños de 5 años o más se consideran adultos.`;
}

/**
 * Capturar número de adultos
 */
async function handleAdultsState(session, messageText, phoneNumber) {
  const adults = parseInt(messageText.trim());
  
  if (isNaN(adults) || adults < 1 || adults > 10) {
    return '❌ Por favor, indica un número válido entre 1 y 10.';
  }

  session.data.adults = adults;
  
  whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_HAS_CHILDREN,
    data: session.data
  });

  return `✅ Adultos: ${adults}

👶 ¿Viaja con *niños menores de 4 años*?

Responde *SÍ* o *NO*
⚠️ Los niños menores de 4 años NO pagan.`;
}

/**
 * Preguntar si viaja con niños
 */
async function handleHasChildrenState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  if (normalized === 'si' || normalized === 'sí' || normalized === 'yes') {
    whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_CHILDREN,
      data: session.data
    });
    
    return `👶 ¿Cuántos *niños menores de 4 años*?

Ingresa un número (1-5)`;
  } else if (normalized === 'no') {
    // No viaja con niños
    session.data.childrenUnder4 = 0;
    session.data.totalGuests = session.data.adults;

    // Obtener pisos disponibles
    const availableFloors = await whatsappService.getAvailableFloors(
      session.data.checkInDate,
      session.data.checkOutDate
    );
    
    if (availableFloors.length === 0) {
      return `❌ Lo sentimos, no hay habitaciones disponibles para las fechas seleccionadas (${session.data.checkInDateFormatted} - ${session.data.checkOutDateFormatted}).

Por favor, escribe *VOLVER* para cambiar las fechas.`;
    }
    
    whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_FLOOR,
      data: session.data
    });

    // Generar menú de pisos
    const floorMenu = availableFloors.map((floor, index) => {
      const floorName = floor === 0 ? 'Planta baja' : `Piso ${floor}`;
      return `${index + 1}. ${floorName}`;
    }).join('\n');

    return `✅ Sin niños menores de 4 años
👥 Total de huéspedes: ${session.data.totalGuests}

� *Paso 2: Selección de Piso*

${floorMenu}

Selecciona el número del piso donde deseas hospedarte.`;
  }
  
  return `❌ Por favor responde *SÍ* o *NO*`;
}

/**
 * Capturar número de niños menores de 4
 */
async function handleChildrenState(session, messageText, phoneNumber) {
  const children = parseInt(messageText.trim());
  
  if (isNaN(children) || children < 1 || children > 5) {
    return '❌ Por favor, indica un número válido entre 1 y 5.';
  }

  session.data.childrenUnder4 = children;
  session.data.totalGuests = session.data.adults + children;
  
  // Obtener pisos disponibles
  const availableFloors = await whatsappService.getAvailableFloors(
    session.data.checkInDate,
    session.data.checkOutDate
  );
  
  if (availableFloors.length === 0) {
    return `❌ Lo sentimos, no hay habitaciones disponibles para las fechas seleccionadas (${session.data.checkInDateFormatted} - ${session.data.checkOutDateFormatted}).

Por favor, escribe *VOLVER* para cambiar las fechas.`;
  }
  
  whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_FLOOR,
    data: session.data
  });

  // Generar menú de pisos
  const floorMenu = availableFloors.map((floor, index) => {
    const floorName = floor === 0 ? 'Planta baja' : `Piso ${floor}`;
    return `${index + 1}. ${floorName}`;
  }).join('\n');

  return `✅ Niños menores de 4 años: ${children}
👥 Total de huéspedes: ${session.data.totalGuests}

� *Paso 2: Selección de Piso*

${floorMenu}

Selecciona el número del piso donde deseas hospedarte.`;
}

/**
 * Capturar selección de piso
 */
async function handleFloorState(session, messageText, phoneNumber) {
  // Obtener pisos disponibles nuevamente para validar
  const availableFloors = await whatsappService.getAvailableFloors(
    session.data.checkInDate,
    session.data.checkOutDate
  );
  
  if (availableFloors.length === 0) {
    return `❌ Lo sentimos, no hay habitaciones disponibles.

Por favor, escribe *VOLVER* para cambiar las fechas.`;
  }

  const input = messageText.trim();
  const numberInput = parseInt(input);
  
  // Validar que el número esté en el rango del menú
  if (isNaN(numberInput) || numberInput < 1 || numberInput > availableFloors.length) {
    const floorMenu = availableFloors.map((floor, index) => {
      const floorName = floor === 0 ? 'Planta baja' : `Piso ${floor}`;
      return `${index + 1}. ${floorName}`;
    }).join('\n');
    
    return `❌ Por favor, selecciona un número válido:

${floorMenu}`;
  }

  // Obtener el piso seleccionado (índice - 1)
  const selectedFloor = availableFloors[numberInput - 1];
  session.data.selectedFloor = selectedFloor;

  // Ahora verificar tipos de habitación disponibles en ese piso
  const availableTypes = await roomValidator.getAvailableRoomTypes(
    session.data.checkInDate,
    session.data.checkOutDate
  );
  
  if (availableTypes.length === 0) {
    return `❌ Lo sentimos, no hay habitaciones disponibles en el ${selectedFloor === 0 ? 'planta baja' : `piso ${selectedFloor}`}.

Por favor, escribe *VOLVER* para seleccionar otro piso.`;
  }

  // Filtrar tipos que tengan habitaciones en el piso seleccionado
  const typesOnFloor = [];
  for (const type of availableTypes) {
    const roomsOnFloor = await whatsappService.getAvailableRoomsByType(
      type.id,
      session.data.checkInDate,
      session.data.checkOutDate,
      selectedFloor
    );
    if (roomsOnFloor.length > 0) {
      typesOnFloor.push(type);
    }
  }

  if (typesOnFloor.length === 0) {
    return `❌ No hay tipos de habitación disponibles en el ${selectedFloor === 0 ? 'planta baja' : `piso ${selectedFloor}`}.

Por favor, escribe *VOLVER* para seleccionar otro piso.`;
  }

  // Filtrar por capacidad
  const suitableTypes = typesOnFloor.filter(type => type.base_capacity >= session.data.totalGuests);
  
  if (suitableTypes.length === 0) {
    return `❌ No hay habitaciones con capacidad para ${session.data.totalGuests} huésped(es) en el ${selectedFloor === 0 ? 'planta baja' : `piso ${selectedFloor}`}.

Por favor, escribe *VOLVER* para seleccionar otro piso o cambiar el número de huéspedes.`;
  }

  // Guardar tipos disponibles en sesión
  session.data.availableRoomTypes = suitableTypes;
  
  whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_ROOM_TYPE,
    data: session.data
  });

  // Generar menú de tipos de habitación
  const typeMenu = suitableTypes.map((type, index) => {
    return `${index + 1}. *${type.name}* - $${type.price?.toLocaleString('es-CL') || 'N/A'}/noche
   👥 Capacidad: ${type.base_capacity} personas
   🛏️ ${type.bed_configuration || 'Sin especificar'}`;
  }).join('\n\n');

  const floorName = selectedFloor === 0 ? 'Planta baja' : `Piso ${selectedFloor}`;

  return `✅ Piso seleccionado: ${floorName}

🏨 *Paso 3: Selección de Tipo de Habitación*

${typeMenu}

Selecciona el número del tipo de habitación que deseas.`;
}

/**
 * Capturar tipo de habitación (solo mostrar tipos disponibles)
 */
async function handleRoomTypeState(session, messageText, phoneNumber) {
  const availableTypes = session.data.availableRoomTypes || [];
  
  if (availableTypes.length === 0) {
    return '❌ Error: No hay tipos de habitación disponibles. Escribe *VOLVER* para reintentar.';
  }

  const input = messageText.trim();
  const numberInput = parseInt(input);
  
  let selectedType = null;
  
  // Validar por número
  if (!isNaN(numberInput) && numberInput > 0 && numberInput <= availableTypes.length) {
    selectedType = availableTypes[numberInput - 1];
  } else {
    // Intentar por nombre
    const normalized = input.toLowerCase();
    selectedType = availableTypes.find(type => 
      type.name.toLowerCase() === normalized ||
      type.name.toLowerCase().includes(normalized) ||
      normalized.includes(type.name.toLowerCase())
    );
  }
  
  if (!selectedType) {
    return `❌ Opción no válida. Por favor, selecciona un número entre 1 y ${availableTypes.length} o el nombre del tipo de habitación.`;
  }

  // Validar capacidad
  const maxCapacity = selectedType.base_capacity;
  if (session.data.totalGuests > maxCapacity) {
    return `❌ El tipo de habitación *${selectedType.name}* tiene capacidad máxima de *${maxCapacity}* persona(s).

Has indicado *${session.data.totalGuests}* huéspedes.

Por favor, selecciona otro tipo de habitación o escribe *VOLVER* para cambiar el número de huéspedes.`;
  }

  session.data.roomTypeId = selectedType.id;
  session.data.roomTypeName = selectedType.name;
  session.data.roomInfo = selectedType;
  
  // Obtener habitaciones específicas disponibles de ese tipo en el piso seleccionado
  const availableRooms = await whatsappService.getAvailableRoomsByType(
    selectedType.id,
    session.data.checkInDate,
    session.data.checkOutDate,
    session.data.selectedFloor
  );

  if (availableRooms.length === 0) {
    return `❌ Lo sentimos, no hay habitaciones *${selectedType.name}* disponibles para las fechas seleccionadas.

Por favor, selecciona otro tipo de habitación:

${await roomValidator.getAvailableRoomTypesMenu(session.data.checkInDate, session.data.checkOutDate, session.data.totalGuests)}`;
  }

  // Guardar habitaciones disponibles en sesión
  session.data.availableRooms = availableRooms;
  
  whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_SPECIFIC_ROOM,
    data: session.data
  });

  return `✅ Tipo seleccionado: *${selectedType.name}*
📋 Capacidad: ${maxCapacity} persona(s)

🛏️ *Habitaciones disponibles:*

${availableRooms.map((room, index) => `${index + 1}. *${room.room_number}* - ${room.floor ? `Piso ${room.floor}` : 'Planta baja'}`).join('\n')}

Selecciona el número de la habitación que prefieres.`;
}

/**
 * Capturar habitación específica
 */
async function handleSpecificRoomState(session, messageText, phoneNumber) {
  const selection = parseInt(messageText.trim());
  
  if (isNaN(selection) || selection < 1 || selection > session.data.availableRooms.length) {
    return `❌ Por favor, selecciona un número válido entre 1 y ${session.data.availableRooms.length}.`;
  }

  const selectedRoom = session.data.availableRooms[selection - 1];
  session.data.roomId = selectedRoom.room_id;
  session.data.roomNumber = selectedRoom.room_number;
  
  whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_NAME,
    data: session.data
  });

  return `✅ Habitación seleccionada: *${session.data.roomTypeName}* - Habitación ${session.data.roomNumber}
📋 Capacidad: ${session.data.roomInfo.base_capacity || session.data.roomInfo.capacity} persona(s)

📝 *Paso 3: Datos del Huésped Principal*

¿Cuál es tu *nombre completo*?`;
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
    state: STATES.AWAITING_SERVICES,
    data: session.data
  });

  return `✅ Solicitudes registradas

🛎️ *Paso 4: Servicios Adicionales (Opcional)*

¿Deseas agregar servicios adicionales a tu reserva?

1️⃣ *Lavandería*
2️⃣ *Desayuno*
3️⃣ *Ambos servicios*
4️⃣ *NO*, continuar sin servicios

Responde con el *número* o *NO* para omitir.`;
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

  // Calcular costos
  const nights = data.nights || 1;
  const roomPrice = data.roomInfo?.price || 0;
  const roomTotal = roomPrice * nights;

  // Servicios adicionales
  let servicesText = '\n   Ninguno';
  let servicesTotal = 0;
  
  if (data.services && (data.services.laundry || data.services.breakfast)) {
    const servicesList = [];
    
    if (data.services.laundry) {
      servicesList.push(`Lavandería (${data.services.laundryQuantity} prendas)`);
    }
    
    if (data.services.breakfast) {
      const breakfastQty = data.services.breakfastQuantity || 0;
      const breakfastPrice = 3000; // $3,000 por persona por noche
      const breakfastTotal = breakfastPrice * breakfastQty * nights;
      servicesTotal += breakfastTotal;
      
      const prefs = data.services.breakfastPreferences?.join(', ') || 'Estándar';
      servicesList.push(`Desayuno (${breakfastQty} personas x ${nights} noches) - $${breakfastTotal.toLocaleString()}\n     Preferencias: ${prefs}`);
    }
    
    servicesText = '\n   ' + servicesList.join('\n   ');
  }

  // Huéspedes adicionales
  let additionalGuestsText = '\n   Ninguno';
  if (data.additionalGuests && data.additionalGuests.length > 0) {
    const guestsList = data.additionalGuests.map((guest, index) => {
      if (guest.isChild) {
        return `${index + 2}. ${guest.name} (Niño <4 años)\n     RUT: ${guest.rut}`;
      } else {
        return `${index + 2}. ${guest.name}\n     RUT: ${guest.rut}\n     Email: ${guest.email}\n     Teléfono: ${guest.phone}`;
      }
    });
    additionalGuestsText = '\n   ' + guestsList.join('\n   ');
  }
  
  const adultsText = data.adults ? `${data.adults} adulto(s)` : '';
  const childrenText = data.childrenUnder4 > 0 ? `, ${data.childrenUnder4} niño(s) <4 años` : '';

  // Calcular total
  const totalReservation = roomTotal + servicesTotal;

  // Texto de piso
  const floorText = data.selectedFloor !== undefined && data.selectedFloor !== null 
    ? (data.selectedFloor === 0 ? 'Planta baja' : `Piso ${data.selectedFloor}`)
    : 'Por asignar';

  return `📋 *Resumen de tu reserva*

👤 *Huésped Principal:*
   • Nombre: ${data.name}
   • RUT: ${data.rut}
   • Email: ${data.email}
   • Teléfono: ${data.phone}

🏨 *Detalles de la reserva:*
   • Entrada: ${data.checkInDateFormatted}
   • Salida: ${data.checkOutDateFormatted}
   • Noches: ${nights}
   • Habitación: ${data.roomTypeName || data.roomInfo?.name || 'N/A'}
   • Número de habitación: ${data.roomNumber || 'Por asignar'}
   • Piso: ${floorText}
   • Huéspedes: ${adultsText}${childrenText}

🛎️ *Servicios adicionales:*${servicesText}

👥 *Huéspedes adicionales:*${additionalGuestsText}

📝 *Solicitudes especiales:*${specialRequests}

💰 *Resumen de Costos:*
   • Habitación (${nights} noches): $${roomTotal.toLocaleString()}
   • Servicios adicionales: $${servicesTotal.toLocaleString()}
   • *TOTAL: $${totalReservation.toLocaleString()}*

---

¿Los datos son correctos?

1️⃣ *SÍ* - Enviar solicitud
2️⃣ *NO* - Cancelar y reiniciar`;
}

/**
 * Paso 4: Servicios Adicionales
 */

/**
 * Capturar selección de servicios
 */
async function handleServicesState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  // Inicializar array de servicios si no existe
  if (!session.data.services) {
    session.data.services = {
      laundry: false,
      breakfast: false,
      breakfastPreference: ''
    };
  }
  
  if (normalized === 'no' || normalized === '4' || normalized === 'ninguno') {
    // No agregar servicios, ir directo a huéspedes adicionales
    whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_ADDITIONAL_GUESTS_CHOICE,
      data: session.data
    });
    
    const totalGuests = session.data.totalGuests || 1;
    const additionalGuestsNeeded = totalGuests - 1;
    
    if (additionalGuestsNeeded > 0) {
      return `📝 *Paso 5: Huéspedes Adicionales (Opcional)*

Tienes *${totalGuests}* huéspede(s) en total.
Ya registraste al huésped principal.

¿Deseas registrar los datos de los otros *${additionalGuestsNeeded}* huésped(es)?

Responde *SÍ* o *NO*`;
    } else {
      // Solo hay 1 huésped, ir directo a confirmación
      whatsappService.updateSession(phoneNumber, {
        state: STATES.AWAITING_CONFIRMATION,
        data: session.data
      });
      return getConfirmationMessage(session.data);
    }
  }
  
  if (normalized === '1' || normalized.includes('lavand')) {
    // Solo lavandería
    session.data.services.laundry = true;
    whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_LAUNDRY,
      data: session.data
    });
    return `✅ Servicio de *Lavandería* seleccionado

¿Cuántas prendas necesitas lavar?

Ingresa un número (ejemplo: 5)`;
  }
  
  if (normalized === '2' || normalized.includes('desayun')) {
    // Solo desayuno
    session.data.services.breakfast = true;
    whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_BREAKFAST,
      data: session.data
    });
    return `✅ Servicio de *Desayuno* seleccionado

¿Cuántos desayunos necesitas por día?

Ingresa un número (ejemplo: 2)`;
  }
  
  if (normalized === '3' || normalized.includes('ambos')) {
    // Ambos servicios
    session.data.services.laundry = true;
    session.data.services.breakfast = true;
    whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_LAUNDRY,
      data: session.data
    });
    return `✅ Servicios *Lavandería* y *Desayuno* seleccionados

Primero, ¿cuántas prendas necesitas lavar?

Ingresa un número (ejemplo: 5)`;
  }
  
  return `❌ Opción no válida

Por favor selecciona:
1️⃣ Lavandería
2️⃣ Desayuno
3️⃣ Ambos servicios
4️⃣ NO, continuar sin servicios`;
}

/**
 * Capturar cantidad de lavandería
 */
async function handleLaundryState(session, messageText, phoneNumber) {
  const quantity = parseInt(messageText.trim());
  
  if (isNaN(quantity) || quantity < 1 || quantity > 50) {
    return `❌ Por favor ingresa un número válido entre 1 y 50`;
  }
  
  session.data.services.laundryQuantity = quantity;
  
  // Si también seleccionó desayuno, preguntar por desayuno
  if (session.data.services.breakfast) {
    whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_BREAKFAST,
      data: session.data
    });
    return `✅ Lavandería: ${quantity} prenda(s)

Ahora, ¿cuántos desayunos necesitas por día?

Ingresa un número (ejemplo: 2)`;
  }
  
  // Si no hay desayuno, ir a huéspedes adicionales
  whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_ADDITIONAL_GUESTS_CHOICE,
    data: session.data
  });
  
  const totalGuests = session.data.totalGuests || 1;
  const additionalGuestsNeeded = totalGuests - 1;
  
  if (additionalGuestsNeeded > 0) {
    return `✅ Servicios registrados

📝 *Paso 5: Huéspedes Adicionales (Opcional)*

Tienes *${totalGuests}* huéspede(s) en total.
Ya registraste al huésped principal.

¿Deseas registrar los datos de los otros *${additionalGuestsNeeded}* huésped(es)?

Responde *SÍ* o *NO*`;
  } else {
    whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_CONFIRMATION,
      data: session.data
    });
    return getConfirmationMessage(session.data);
  }
}

/**
 * Capturar cantidad de desayunos
 */
async function handleBreakfastState(session, messageText, phoneNumber) {
  const quantity = parseInt(messageText.trim());
  
  if (isNaN(quantity) || quantity < 1 || quantity > 20) {
    return `❌ Por favor ingresa un número válido entre 1 y 20`;
  }
  
  session.data.services.breakfastQuantity = quantity;
  
  // Inicializar array de preferencias
  if (!session.data.services.breakfastPreferences) {
    session.data.services.breakfastPreferences = [];
  }

  // Obtener items de desayuno desde la base de datos
  const breakfastItems = await whatsappService.getBreakfastMenuItems();
  
  // Guardar items en sesión para validación posterior
  session.data.breakfastItems = breakfastItems;
  
  whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_BREAKFAST_PREFERENCE,
    data: session.data
  });

  // Construir menú dinámicamente
  let menu = `✅ Desayuno: ${quantity} persona(s)\n\n🥐 *Preferencias de Desayuno (Opcional)*\n\nPuedes seleccionar varios ingredientes para tu desayuno buffet:\n\n`;
  
  if (breakfastItems.length === 0) {
    menu += 'No hay items de desayuno disponibles en este momento.\n\nResponde *NINGUNO* para continuar.';
  } else {
    // Agrupar por categoría si existe
    const categories = {};
    breakfastItems.forEach(item => {
      const cat = item.category || 'Otros';
      if (!categories[cat]) {
        categories[cat] = [];
      }
      categories[cat].push(item);
    });

    let itemNumber = 1;
    for (const [category, items] of Object.entries(categories)) {
      menu += `*${category}:*\n`;
      items.forEach(item => {
        menu += `${itemNumber}. ${item.name}`;
        if (item.description) {
          menu += ` - ${item.description}`;
        }
        menu += '\n';
        itemNumber++;
      });
      menu += '\n';
    }

    menu += `Responde con los *números* separados por comas.\nEjemplo: *1,3,5* o *NINGUNO* para continuar.`;
  }

  return menu;
}

/**
 * Capturar preferencias de desayuno (selección múltiple)
 */
async function handleBreakfastPreferenceState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  // Obtener items guardados en sesión
  const breakfastItems = session.data.breakfastItems || [];
  
  if (normalized === 'ninguno' || normalized === 'no' || normalized === 'ninguna') {
    session.data.services.breakfastPreferences = ['Estándar'];
  } else {
    // Procesar números separados por comas
    const selections = normalized.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    
    if (selections.length === 0) {
      return `❌ Por favor ingresa números válidos separados por comas (ej: 1,3,5) o *NINGUNO*`;
    }
    
    // Validar que todos los números estén en el rango
    const maxNumber = breakfastItems.length;
    const invalidSelections = selections.filter(n => n < 1 || n > maxNumber);
    if (invalidSelections.length > 0) {
      return `❌ Algunos números no son válidos. Usa números del 1 al ${maxNumber}.`;
    }
    
    // Convertir números a nombres usando los items de la BD
    session.data.services.breakfastPreferences = selections.map(n => breakfastItems[n - 1].name);
  }
  
  whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_ADDITIONAL_GUESTS_CHOICE,
    data: session.data
  });
  
  const totalGuests = session.data.totalGuests || 1;
  const additionalGuestsNeeded = totalGuests - 1;
  
  const preferencesText = session.data.services.breakfastPreferences.join(', ');
  
  if (additionalGuestsNeeded > 0) {
    return `✅ Preferencias registradas: ${preferencesText}

📝 *Paso 5: Huéspedes Adicionales*

Tienes *${totalGuests}* huéspede(s) en total.
Ya registraste al huésped principal.

⚠️ *IMPORTANTE*: Debes registrar los datos completos de los otros *${additionalGuestsNeeded}* huésped(es).

Responde *CONTINUAR* para comenzar.`;
  } else {
    whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_CONFIRMATION,
      data: session.data
    });
    return getConfirmationMessage(session.data);
  }
}

/**
 * Paso 5: Huéspedes Adicionales (OBLIGATORIO)
 */

/**
 * Confirmar inicio de captura de huéspedes adicionales
 */
async function handleAdditionalGuestsChoiceState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  const totalGuests = session.data.totalGuests || 1;
  const additionalGuestsNeeded = totalGuests - 1;
  
  // Si solo hay 1 huésped, ir directo a confirmación
  if (additionalGuestsNeeded === 0) {
    whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_CONFIRMATION,
      data: session.data
    });
    return getConfirmationMessage(session.data);
  }
  
  if (normalized === 'continuar' || normalized === 'si' || normalized === 'sí') {
    // Inicializar array de huéspedes adicionales
    if (!session.data.additionalGuests) {
      session.data.additionalGuests = [];
    }

    // Inicializar contador de niños y adultos adicionales
    if (!session.data.currentChildGuest) {
      session.data.currentChildGuest = 0;
    }
    if (!session.data.currentAdultGuest) {
      session.data.currentAdultGuest = 0;
    }
    
    whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_ADDITIONAL_GUEST_NAME,
      data: session.data
    });
    
    const guestNumber = session.data.additionalGuests.length + 2; // +1 por el principal, +1 por el actual
    
    // Determinar si es niño o adulto
    const childrenUnder4 = session.data.childrenUnder4 || 0;
    const isChild = session.data.currentChildGuest < childrenUnder4;
    
    if (isChild) {
      return `📝 *Niño ${session.data.currentChildGuest + 1} de ${childrenUnder4}* (menor de 4 años)

⚠️ Para niños solo necesitamos:
• Nombre completo
• RUT

¿Cuál es el *nombre completo* del niño?`;
    } else {
      return `📝 *Huésped adulto ${session.data.currentAdultGuest + 1}*

¿Cuál es el *nombre completo* de este huésped?`;
    }
  }
  
  return `❌ Por favor responde *CONTINUAR* para registrar los huéspedes adicionales.`;
}

/**
 * Capturar nombre de huésped adicional
 */
async function handleAdditionalGuestNameState(session, messageText, phoneNumber) {
  const validation = guestValidator.validateName(messageText);
  
  if (!validation.valid) {
    return validation.message;
  }

  const childrenUnder4 = session.data.childrenUnder4 || 0;
  const isChild = session.data.currentChildGuest < childrenUnder4;
  
  // Guardar temporalmente el nombre
  session.data.tempAdditionalGuest = {
    name: validation.name,
    isChild: isChild
  };
  
  whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_ADDITIONAL_GUEST_RUT,
    data: session.data
  });
  
  return `✅ Nombre registrado: ${validation.name}

¿Cuál es su *RUT*?

Formato: 11.111.111-1`;
}

/**
 * Capturar RUT de huésped adicional (con validación de duplicados)
 */
async function handleAdditionalGuestRutState(session, messageText, phoneNumber) {
  const validation = guestValidator.validateRut(messageText);
  
  if (!validation.valid) {
    return validation.message;
  }
  
  // Validar que no sea el mismo RUT del huésped principal
  if (validation.rut === session.data.rut) {
    return `❌ Este RUT pertenece al huésped principal.

Por favor ingresa un RUT diferente.`;
  }
  
  // Validar que no haya duplicados en huéspedes adicionales
  const isDuplicate = session.data.additionalGuests?.some(
    guest => guest.rut === validation.rut
  );
  
  if (isDuplicate) {
    return `❌ Este RUT ya fue registrado para otro huésped.

Por favor ingresa un RUT diferente.`;
  }
  
  session.data.tempAdditionalGuest.rut = validation.rut;

  const isChild = session.data.tempAdditionalGuest.isChild;

  // Si es niño, solo pedir nombre y RUT, luego guardar
  if (isChild) {
    // Agregar niño a la lista con datos básicos
    session.data.additionalGuests.push({
      name: session.data.tempAdditionalGuest.name,
      rut: session.data.tempAdditionalGuest.rut,
      isChild: true,
      email: 'N/A',
      phone: 'N/A'
    });

    session.data.currentChildGuest++;
    delete session.data.tempAdditionalGuest;

    whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_MORE_GUESTS,
      data: session.data
    });

    const currentGuestsCount = session.data.additionalGuests.length + 1;
    const totalGuests = session.data.totalGuests || 1;
    const remaining = totalGuests - currentGuestsCount;

    if (remaining > 0) {
      return `✅ Niño registrado

📊 Progreso: *${currentGuestsCount}* de *${totalGuests}* huéspedes
⚠️ Faltan *${remaining}* huésped(es) por registrar

Responde *CONTINUAR* para agregar el siguiente huésped.`;
    } else {
      whatsappService.updateSession(phoneNumber, {
        state: STATES.AWAITING_CONFIRMATION,
        data: session.data
      });

      return `✅ ¡Todos los huéspedes registrados! (${currentGuestsCount}/${totalGuests})

${getConfirmationMessage(session.data)}`;
    }
  }
  
  // Si es adulto, continuar con email y teléfono
  whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_ADDITIONAL_GUEST_EMAIL,
    data: session.data
  });
  
  return `✅ RUT registrado: ${validation.rut}

¿Cuál es su *correo electrónico*?

Escribe el email (ejemplo: juan@email.com)`;
}

/**
 * Capturar email de huésped adicional (OBLIGATORIO)
 */
async function handleAdditionalGuestEmailState(session, messageText, phoneNumber) {
  const validation = guestValidator.validateEmail(messageText);
  
  if (!validation.valid) {
    return validation.message;
  }
  
  session.data.tempAdditionalGuest.email = validation.email;
  
  whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_ADDITIONAL_GUEST_PHONE,
    data: session.data
  });
  
  return `✅ Email registrado: ${validation.email}

¿Cuál es su *número de teléfono*?

Formato: +56912345678`;
}

/**
 * Capturar teléfono de huésped adicional (OBLIGATORIO - solo adultos)
 */
async function handleAdditionalGuestPhoneState(session, messageText, phoneNumber) {
  const validation = guestValidator.validatePhone(messageText);
  
  if (!validation.valid) {
    return validation.message;
  }
  
  session.data.tempAdditionalGuest.phone = validation.phone;
  
  // Agregar adulto a la lista con todos los datos
  session.data.additionalGuests.push({
    ...session.data.tempAdditionalGuest,
    isChild: false
  });

  session.data.currentAdultGuest++;
  delete session.data.tempAdditionalGuest;
  
  whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_MORE_GUESTS,
    data: session.data
  });
  
  const currentGuestsCount = session.data.additionalGuests.length + 1; // +1 por el principal
  const totalGuests = session.data.totalGuests || 1;
  const remaining = totalGuests - currentGuestsCount;
  
  if (remaining > 0) {
    return `✅ Huésped adulto registrado

📊 Progreso: *${currentGuestsCount}* de *${totalGuests}* huéspedes
⚠️ Faltan *${remaining}* huésped(es) por registrar

Responde *CONTINUAR* para agregar el siguiente huésped.`;
  } else {
    // Ya se completaron todos los huéspedes
    whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_CONFIRMATION,
      data: session.data
    });
    
    return `✅ ¡Todos los huéspedes registrados! (${currentGuestsCount}/${totalGuests})

${getConfirmationMessage(session.data)}`;
  }
}

/**
 * Continuar agregando huéspedes (OBLIGATORIO hasta completar)
 */
async function handleMoreGuestsState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  const currentGuestsCount = session.data.additionalGuests.length + 1;
  const totalGuests = session.data.totalGuests || 1;
  const remaining = totalGuests - currentGuestsCount;
  
  if (remaining === 0) {
    // Ya están todos registrados
    whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_CONFIRMATION,
      data: session.data
    });
    
    return getConfirmationMessage(session.data);
  }
  
  if (normalized === 'continuar' || normalized === 'si' || normalized === 'sí') {
    whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_ADDITIONAL_GUEST_NAME,
      data: session.data
    });
    
    const guestNumber = currentGuestsCount + 1;

    // Determinar si el siguiente huésped es niño o adulto
    const childrenUnder4 = session.data.childrenUnder4 || 0;
    const isChild = session.data.currentChildGuest < childrenUnder4;

    if (isChild) {
      return `📝 *Niño ${session.data.currentChildGuest + 1} de ${childrenUnder4}* (menor de 4 años)

⚠️ Para niños solo necesitamos:
• Nombre completo
• RUT

¿Cuál es el *nombre completo* del niño?`;
    } else {
      return `📝 *Huésped adulto ${session.data.currentAdultGuest + 1}*

¿Cuál es el *nombre completo* de este huésped?`;
    }
  }
  
  return `❌ Debes completar el registro de todos los huéspedes.

Faltan *${remaining}* huésped(es).

Responde *CONTINUAR* para agregar el siguiente.`;
}

module.exports = {
  STATES,
  processMessage
};
