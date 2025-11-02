/**
 * Flujo de conversación para reservas del chatbot de WhatsApp
 */

const whatsappService = require('../whatsapp.service');
const dateValidator = require('../validators/date.validator');
const guestValidator = require('../validators/guest.validator');
const roomValidator = require('../validators/room.validator');
const menuFlow = require('./menu.flow');

/**
 * Estados del flujo de reserva (reorganizado)
 * Paso 1: Fechas y Huéspedes
 * Paso 2: Habitaciones
 * Paso 3: Solicitudes Especiales y Servicios Adicionales
 * Paso 4: Verificación de Registro y Datos del Huésped
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
  // Paso 3: Solicitudes Especiales y Servicios (MOVIDO ANTES)
  AWAITING_SPECIAL_REQUESTS: 'AWAITING_SPECIAL_REQUESTS',
  AWAITING_SERVICES: 'AWAITING_SERVICES',
  AWAITING_LAUNDRY: 'AWAITING_LAUNDRY',
  AWAITING_BREAKFAST: 'AWAITING_BREAKFAST',
  AWAITING_BREAKFAST_PREFERENCE: 'AWAITING_BREAKFAST_PREFERENCE',
  // Paso 4: Verificación de Registro y Datos del Huésped Principal
  AWAITING_IS_CHILEAN: 'AWAITING_IS_CHILEAN',
  AWAITING_REGISTRATION_CHECK: 'AWAITING_REGISTRATION_CHECK',
  AWAITING_GUEST_FOUND_CONFIRMATION: 'AWAITING_GUEST_FOUND_CONFIRMATION',
  AWAITING_RUT_OR_PASSPORT: 'AWAITING_RUT_OR_PASSPORT',
  AWAITING_NAME: 'AWAITING_NAME',
  AWAITING_RUT: 'AWAITING_RUT',
  AWAITING_EMAIL: 'AWAITING_EMAIL',
  AWAITING_PHONE: 'AWAITING_PHONE',
  AWAITING_BIRTHDATE: 'AWAITING_BIRTHDATE',
  AWAITING_GENDER: 'AWAITING_GENDER',
  AWAITING_COUNTRY: 'AWAITING_COUNTRY',
  AWAITING_REGION: 'AWAITING_REGION',
  AWAITING_CITY: 'AWAITING_CITY',
  // Paso 5: Huéspedes Adicionales (opcional)
  AWAITING_ADDITIONAL_GUESTS_CHOICE: 'AWAITING_ADDITIONAL_GUESTS_CHOICE',
  AWAITING_ADDITIONAL_GUEST_CHOICE: 'AWAITING_ADDITIONAL_GUEST_CHOICE',
  AWAITING_ADDITIONAL_GUEST_IS_CHILEAN: 'AWAITING_ADDITIONAL_GUEST_IS_CHILEAN',
  AWAITING_ADDITIONAL_GUEST_REGISTRATION_CHECK: 'AWAITING_ADDITIONAL_GUEST_REGISTRATION_CHECK',
  AWAITING_ADDITIONAL_GUEST_FOUND_CONFIRMATION: 'AWAITING_ADDITIONAL_GUEST_FOUND_CONFIRMATION',
  AWAITING_ADDITIONAL_GUEST_NAME: 'AWAITING_ADDITIONAL_GUEST_NAME',
  AWAITING_ADDITIONAL_GUEST_RUT: 'AWAITING_ADDITIONAL_GUEST_RUT',
  AWAITING_ADDITIONAL_GUEST_EMAIL: 'AWAITING_ADDITIONAL_GUEST_EMAIL',
  AWAITING_ADDITIONAL_GUEST_PHONE: 'AWAITING_ADDITIONAL_GUEST_PHONE',
  AWAITING_ADDITIONAL_GUEST_BIRTHDATE: 'AWAITING_ADDITIONAL_GUEST_BIRTHDATE',
  AWAITING_ADDITIONAL_GUEST_GENDER: 'AWAITING_ADDITIONAL_GUEST_GENDER',
  AWAITING_ADDITIONAL_GUEST_COUNTRY: 'AWAITING_ADDITIONAL_GUEST_COUNTRY',
  AWAITING_ADDITIONAL_GUEST_REGION: 'AWAITING_ADDITIONAL_GUEST_REGION',
  AWAITING_ADDITIONAL_GUEST_CITY: 'AWAITING_ADDITIONAL_GUEST_CITY',
  // Paso 6: Confirmación y Método de Pago
  AWAITING_CONFIRMATION: 'AWAITING_CONFIRMATION',
  AWAITING_PAYMENT_METHOD: 'AWAITING_PAYMENT_METHOD',
  AWAITING_TRANSFER_OPTION: 'AWAITING_TRANSFER_OPTION'
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
  // Servicios y solicitudes ahora van primero
  [STATES.AWAITING_SPECIAL_REQUESTS]: STATES.AWAITING_SPECIFIC_ROOM,
  [STATES.AWAITING_SERVICES]: STATES.AWAITING_SPECIAL_REQUESTS,
  [STATES.AWAITING_LAUNDRY]: STATES.AWAITING_SERVICES,
  [STATES.AWAITING_BREAKFAST]: STATES.AWAITING_SERVICES,
  [STATES.AWAITING_BREAKFAST_PREFERENCE]: STATES.AWAITING_BREAKFAST,
  // Verificación de registro
  [STATES.AWAITING_IS_CHILEAN]: STATES.AWAITING_SERVICES,
  [STATES.AWAITING_RUT_OR_PASSPORT]: STATES.AWAITING_IS_CHILEAN,
  [STATES.AWAITING_NAME]: STATES.AWAITING_RUT_OR_PASSPORT,
  [STATES.AWAITING_RUT]: STATES.AWAITING_NAME,
  [STATES.AWAITING_EMAIL]: STATES.AWAITING_RUT,
  [STATES.AWAITING_PHONE]: STATES.AWAITING_EMAIL,
  [STATES.AWAITING_BIRTHDATE]: STATES.AWAITING_PHONE,
  [STATES.AWAITING_GENDER]: STATES.AWAITING_BIRTHDATE,
  [STATES.AWAITING_COUNTRY]: STATES.AWAITING_GENDER,
  [STATES.AWAITING_REGION]: STATES.AWAITING_COUNTRY,
  [STATES.AWAITING_CITY]: STATES.AWAITING_REGION,
  // Huéspedes adicionales
  [STATES.AWAITING_ADDITIONAL_GUESTS_CHOICE]: STATES.AWAITING_CITY,
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
    console.log(`[DEBUG] processMessage - Estado: ${session.state}, Mensaje: "${messageText}"`);
    
    // Verificar comandos globales primero
    const globalCommand = menuFlow.checkGlobalCommands(messageText);
    
    if (globalCommand === 'menu') {
      await whatsappService.updateSession(phoneNumber, { state: STATES.INITIAL });
      return menuFlow.getWelcomeMessage();
    }
    
    if (globalCommand === 'cancel') {
      await whatsappService.updateSession(phoneNumber, { 
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
      
      case STATES.AWAITING_BIRTHDATE:
        return await handleBirthdateState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_GENDER:
        return await handleGenderState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_COUNTRY:
        return await handleCountryState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_REGION:
        return await handleRegionState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_CITY:
        return await handleCityState(session, messageText, phoneNumber);
      
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
      
      // Verificación de Registro
      case STATES.AWAITING_IS_CHILEAN:
        return await handleIsChileanState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_REGISTRATION_CHECK:
        return await handleRegistrationCheckState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_GUEST_FOUND_CONFIRMATION:
        return await handleGuestFoundConfirmationState(session, messageText, phoneNumber);
      
      // Paso 5: Huéspedes Adicionales (opcional)
      case STATES.AWAITING_ADDITIONAL_GUESTS_CHOICE:
        return await handleAdditionalGuestsChoiceState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_ADDITIONAL_GUEST_CHOICE:
        return await handleAdditionalGuestChoiceState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_ADDITIONAL_GUEST_IS_CHILEAN:
        return await handleAdditionalGuestIsChileanState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_ADDITIONAL_GUEST_REGISTRATION_CHECK:
        return await handleAdditionalGuestRegistrationCheckState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_ADDITIONAL_GUEST_FOUND_CONFIRMATION:
        return await handleAdditionalGuestFoundConfirmationState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_ADDITIONAL_GUEST_NAME:
        return await handleAdditionalGuestNameState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_ADDITIONAL_GUEST_RUT:
        return await handleAdditionalGuestRutState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_ADDITIONAL_GUEST_EMAIL:
        return await handleAdditionalGuestEmailState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_ADDITIONAL_GUEST_PHONE:
        return await handleAdditionalGuestPhoneState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_ADDITIONAL_GUEST_BIRTHDATE:
        return await handleAdditionalGuestBirthdateState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_ADDITIONAL_GUEST_GENDER:
        return await handleAdditionalGuestGenderState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_ADDITIONAL_GUEST_COUNTRY:
        return await handleAdditionalGuestCountryState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_ADDITIONAL_GUEST_REGION:
        return await handleAdditionalGuestRegionState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_ADDITIONAL_GUEST_CITY:
        return await handleAdditionalGuestCityState(session, messageText, phoneNumber);
      
      // Paso 6: Confirmación y Método de Pago
      case STATES.AWAITING_CONFIRMATION:
        return await handleConfirmationState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_PAYMENT_METHOD:
        return await handlePaymentMethodState(session, messageText, phoneNumber);
      
      case STATES.AWAITING_TRANSFER_OPTION:
        return await handleTransferOptionState(session, messageText, phoneNumber);
      
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
  
  await whatsappService.updateSession(phoneNumber, {
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
      return `🏨 *Paso 2: Selección de Tipo de Habitación*\n\n${await roomValidator.getRoomTypesMenu()}`;
    case STATES.AWAITING_SPECIAL_REQUESTS:
      return `💬 *Paso 3: Solicitudes Especiales*\n\n¿Tienes alguna *solicitud especial*?\n\nEjemplos: Vista al mar, Piso alto/bajo, Cama adicional\n\nEscribe tu solicitud o *NO* si no tienes ninguna.`;
    case STATES.AWAITING_SERVICES:
      return `�️ *Paso 3: Servicios Adicionales (Opcional)*\n\n¿Deseas agregar servicios adicionales?\n\n1️⃣ Lavandería\n2️⃣ Desayuno\n3️⃣ Ambos servicios\n4️⃣ NO, continuar sin servicios`;
    case STATES.AWAITING_IS_CHILEAN:
      return `🌎 *Paso 4: Datos del Huésped Principal*\n\n¿Eres *chileno/a*?\n\n1️⃣ Sí, soy chileno/a\n2️⃣ No, soy extranjero/a\n\nResponde con el número de tu opción.`;
    case STATES.AWAITING_RUT_OR_PASSPORT:
      const docType = data && data.isChilean ? 'RUT' : 'pasaporte';
      const format = data && data.isChilean ? '\n\nFormato: 11.111.111-1' : '\n\nEjemplo: P123456789';
      return `📝 ¿Cuál es tu *${docType}*?${format}\n\nSi ya estás registrado en nuestro sistema, autocompletaremos tus datos.`;
    case STATES.AWAITING_NAME:
      return `📝 ¿Cuál es tu *nombre completo*?`;
    case STATES.AWAITING_RUT:
      return `📝 ¿Cuál es tu *RUT*?\n\nFormato: 11.111.111-1`;
    case STATES.AWAITING_EMAIL:
      return `📧 ¿Cuál es tu *correo electrónico*?`;
    case STATES.AWAITING_PHONE:
      return `📱 ¿Cuál es tu *número de teléfono* de contacto?\n\nFormato: +56912345678`;
    case STATES.AWAITING_BIRTHDATE:
      return `📅 ¿Cuál es tu *fecha de nacimiento*?\n\nFormato: DD/MM/AAAA\nEjemplo: 15/08/1990`;
    case STATES.AWAITING_GENDER:
      return `👤 ¿Cuál es tu *género*?\n\n1️⃣ Hombre\n2️⃣ Mujer\n3️⃣ Otro\n\nResponde con el número de tu opción.`;
    case STATES.AWAITING_COUNTRY:
      return `🌎 ¿De qué *país* eres?\n\nEjemplo: Chile, Argentina, Perú, etc.`;
    case STATES.AWAITING_REGION:
      return `📍 ¿De qué *región* eres?\n\nEjemplo: Metropolitana, Valparaíso, Biobío, etc.`;
    case STATES.AWAITING_CITY:
      return `🏙️ ¿De qué *ciudad* eres?\n\nEjemplo: Santiago, Valparaíso, Concepción, etc.`;
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
    await whatsappService.updateSession(phoneNumber, { 
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
 * Verificación de Registro - Paso 1: ¿Es chileno?
 */
async function handleIsChileanState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  if (normalized === '1' || normalized === 'si' || normalized === 'sí' || normalized === 'yes') {
    session.data.isChilean = true;
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_REGISTRATION_CHECK,
      data: session.data
    });
    
    return `📋 *Verificación de Cliente Registrado*

¿Has realizado reservas con nosotros anteriormente?

Por favor, ingresa tu *RUT* para verificar si ya tienes datos registrados.

Formato: 11.111.111-1

💡 Si no has venido antes, igual puedes continuar ingresando tu RUT.`;
  } else if (normalized === '2' || normalized === 'no') {
    session.data.isChilean = false;
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_REGISTRATION_CHECK,
      data: session.data
    });
    
    return `📋 *Verificación de Cliente Registrado*

¿Has realizado reservas con nosotros anteriormente?

Por favor, ingresa tu *número de pasaporte* para verificar si ya tienes datos registrados.

Ejemplo: ABC123456

💡 Si no has venido antes, igual puedes continuar ingresando tu pasaporte.`;
  }
  
  return `❌ Por favor responde:
1️⃣ *SÍ* - Si eres chileno(a)
2️⃣ *NO* - Si eres extranjero(a)`;
}

/**
 * Verificación de Registro - Paso 2: Buscar en BD por RUT o Pasaporte
 */
async function handleRegistrationCheckState(session, messageText, phoneNumber) {
  const input = messageText.trim();
  
  let guest = null;
  let idType = '';
  
  if (session.data.isChilean) {
    // Validar RUT
    const validation = guestValidator.validateRut(input);
    if (!validation.valid) {
      return validation.message;
    }
    
    const formattedRut = validation.rut; // Con formato: 21.332.187-0
    const normalizedRut = formattedRut.replace(/\./g, ''); // Sin puntos: 21332187-0
    idType = 'RUT';
    
    // Buscar en BD por RUT normalizado (sin puntos)
    try {
      guest = await whatsappService.findGuestByRut(normalizedRut);
      session.data.rut = formattedRut; // Guardar con formato para mostrar
    } catch (error) {
      console.error('Error al buscar huésped por RUT:', error);
      return `❌ Hubo un error al verificar tus datos. Por favor, intenta nuevamente.`;
    }
  } else {
    // Validar Pasaporte (formato flexible)
    if (input.length < 5 || input.length > 20) {
      return `❌ El pasaporte debe tener entre 5 y 20 caracteres. Por favor, inténtalo nuevamente.`;
    }
    
    const normalizedPassport = input.toUpperCase();
    idType = 'Pasaporte';
    
    // Buscar en BD por Pasaporte
    try {
      guest = await whatsappService.findGuestByPassport(normalizedPassport);
      session.data.passport = normalizedPassport; // Guardar pasaporte siempre
    } catch (error) {
      console.error('Error al buscar huésped por Pasaporte:', error);
      return `❌ Hubo un error al verificar tus datos. Por favor, intenta nuevamente.`;
    }
  }
  
  if (guest) {
    // Cliente encontrado - Autocompletar datos
    session.data.foundGuest = guest;
    
    // Construir nombre completo
    const fullName = `${guest.first_name} ${guest.paternal_last_name}${guest.maternal_last_name ? ' ' + guest.maternal_last_name : ''}`;
    session.data.name = fullName;
    session.data.email = guest.email;
    session.data.phone = guest.phone_number;
    session.data.birthdate = guest.birth_date ? new Date(guest.birth_date).toISOString().split('T')[0] : null;
    session.data.gender = guest.gender;
    session.data.country = guest.country;
    session.data.region = guest.region;
    session.data.city = guest.city;
    
    // Actualizar sesión al nuevo estado - pasar solo lo que cambia
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_GUEST_FOUND_CONFIRMATION,
      data: session.data
    });
    
    console.log(`[DEBUG] Usuario encontrado, estado actualizado a AWAITING_GUEST_FOUND_CONFIRMATION`);
    
    // Construir mensaje con datos opcionales
    let dataMessage = `✅ *¡Te encontramos en nuestro sistema!*

🙋 *Datos registrados:*
• Nombre: *${fullName}*`;
    
    if (guest.email) dataMessage += `\n• Email: *${guest.email}*`;
    if (guest.phone_number) dataMessage += `\n• Teléfono: *${guest.phone_number}*`;
    if (guest.birth_date) dataMessage += `\n• Fecha de Nacimiento: *${new Date(guest.birth_date).toISOString().split('T')[0]}*`;
    if (guest.gender) dataMessage += `\n• Género: *${guest.gender}*`;
    if (guest.country) dataMessage += `\n• País: *${guest.country}*`;
    if (guest.region) dataMessage += `\n• Región: *${guest.region}*`;
    if (guest.city) dataMessage += `\n• Ciudad: *${guest.city}*`;
    
    dataMessage += `\n\n¿Deseas usar estos datos para tu reserva?

Responde:
1️⃣ *SÍ* - Usar estos datos
2️⃣ *NO* - Actualizar mis datos`;
    
    return dataMessage;
  } else {
    // Cliente NO encontrado - Pedir RUT/Pasaporte primero
    session.data.foundGuest = null;
    
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_RUT,
      data: session.data
    });
    
    console.log(`[DEBUG] Usuario NO encontrado, estado actualizado a AWAITING_RUT para registro completo`);
    
    // Mensaje diferente según si es chileno o extranjero
    if (session.data.isChilean) {
      return `📝 *No encontramos tu RUT en nuestro sistema*

No hay problema, vamos a registrarte.

🆔 Por favor, ingresa tu *RUT completo* para continuar con el registro:

Ejemplo: 12.345.678-9`;
    } else {
      return `📝 *No encontramos tu Pasaporte en nuestro sistema*

No hay problema, vamos a registrarte.

� Por favor, ingresa tu *número de pasaporte completo* para continuar con el registro:

Ejemplo: AB123456`;
    }
  }
}

/**
 * Verificación de Registro - Paso 3: Confirmar uso de datos encontrados
 */
async function handleGuestFoundConfirmationState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  console.log(`[DEBUG] handleGuestFoundConfirmationState - Input: "${normalized}", Current State: ${session.state}`);
  
  if (normalized === '1' || normalized === 'si' || normalized === 'sí' || normalized === 'yes') {
    // Usar datos autocompletados - Ir a método de pago
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_PAYMENT_METHOD,
      data: session.data
    });
    
    console.log(`[DEBUG] Estado actualizado a: AWAITING_PAYMENT_METHOD`);
    
    return `✅ *Datos confirmados*

� *Método de Pago*

¿Cómo deseas realizar el pago?

1️⃣ *EFECTIVO* - Pago presencial en el hotel
2️⃣ *TRANSFERENCIA* - Pago por transferencia bancaria

Responde con el número de tu opción.`;
  } else if (normalized === '2' || normalized === 'no') {
    // Quiere actualizar datos - Ir a captura manual
    // Marcar que está actualizando un usuario existente
    session.data.isUpdatingExistingGuest = true;
    session.data.existingGuestId = session.data.foundGuest?.id;
    
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_NAME,
      data: session.data
    });
    
    console.log(`[DEBUG] Estado actualizado a: AWAITING_NAME (Modo actualización)`);
    
    return `📝 *Actualización de Datos Personales*

Perfecto, vamos a actualizar tu información.

Los datos actuales se mostrarán entre paréntesis.
Puedes escribir el nuevo valor o presionar *SALTAR* para mantener el dato actual.

👤 ¿Cuál es tu *nombre completo*?

Actual: *${session.data.name}*

Ejemplo: Juan Pérez`;
  }
  
  return `❌ Por favor responde:
1️⃣ *SÍ* - Para usar los datos encontrados
2️⃣ *NO* - Para actualizar tus datos`;
}

/**
 * Capturar nombre
 */
async function handleNameState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  // Permitir saltar si está en modo actualización
  if (session.data.isUpdatingExistingGuest && (normalized === 'saltar' || normalized === 'omitir')) {
    // Mantener el nombre actual
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_EMAIL,
      data: session.data
    });
    
    return `✅ Nombre mantenido: ${session.data.name}

📝 ¿Cuál es tu *correo electrónico*?

Actual: *${session.data.email || 'No registrado'}*

Escribe el nuevo email o *SALTAR* para mantenerlo`;
  }
  
  const validation = guestValidator.validateName(messageText);
  
  if (!validation.valid) {
    return validation.message;
  }

  session.data.name = validation.name;
  await whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_EMAIL,
    data: session.data
  });

  const nextPrompt = session.data.isUpdatingExistingGuest 
    ? `Actual: *${session.data.email || 'No registrado'}*\n\nEscribe el nuevo email o *SALTAR* para mantenerlo`
    : '';

  return `✅ Perfecto, ${validation.name}

📝 ¿Cuál es tu *correo electrónico*?

${nextPrompt}`;
}

/**
 * Capturar RUT o Pasaporte (dependiendo si es chileno o extranjero)
 */
async function handleRutState(session, messageText, phoneNumber) {
  const input = messageText.trim();
  
  // Si es chileno, validar RUT
  if (session.data.isChilean) {
    const validation = guestValidator.validateRut(input);
    
    if (!validation.valid) {
      return validation.message;
    }

    session.data.rut = validation.rut;
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_NAME,
      data: session.data
    });

    return `✅ RUT registrado: ${validation.rut}

� Ahora, ¿cuál es tu *nombre completo*?

Ejemplo: Juan Pérez González`;
  } else {
    // Si es extranjero, validar Pasaporte
    if (input.length < 5 || input.length > 20) {
      return `❌ El pasaporte debe tener entre 5 y 20 caracteres. Por favor, inténtalo nuevamente.`;
    }
    
    const normalizedPassport = input.toUpperCase();
    session.data.passport = normalizedPassport;
    
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_NAME,
      data: session.data
    });

    return `✅ Pasaporte registrado: ${normalizedPassport}

� Ahora, ¿cuál es tu *nombre completo*?

Ejemplo: John Smith`;
  }
}

/**
 * Capturar email
 */
async function handleEmailState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  // Permitir saltar si está en modo actualización
  if (session.data.isUpdatingExistingGuest && (normalized === 'saltar' || normalized === 'omitir')) {
    // Mantener el email actual
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_PHONE,
      data: session.data
    });
    
    return `✅ Email mantenido

📝 ¿Cuál es tu *número de teléfono* de contacto?

Actual: *${session.data.phone || 'No registrado'}*

Formato: +56912345678
Escribe el nuevo teléfono o *SALTAR* para mantenerlo`;
  }
  
  const validation = guestValidator.validateEmail(messageText);
  
  if (!validation.valid) {
    return validation.message;
  }

  session.data.email = validation.email;
  await whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_PHONE,
    data: session.data
  });

  const nextPrompt = session.data.isUpdatingExistingGuest
    ? `Actual: *${session.data.phone || 'No registrado'}*\n\nFormato: +56912345678\nEscribe el nuevo teléfono o *SALTAR* para mantenerlo`
    : 'Formato: +56912345678';

  return `✅ Email registrado

📝 ¿Cuál es tu *número de teléfono* de contacto?

${nextPrompt}`;
}

/**
 * Capturar teléfono
 */
async function handlePhoneState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  // Permitir saltar si está en modo actualización
  if (session.data.isUpdatingExistingGuest && (normalized === 'saltar' || normalized === 'omitir')) {
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_BIRTHDATE,
      data: session.data
    });
    
    const birthdateDisplay = session.data.birthdate 
      ? session.data.birthdate
      : 'No registrado';
    
    return `✅ Teléfono mantenido

📅 ¿Cuál es tu *fecha de nacimiento*?

Actual: *${birthdateDisplay}*

Formato: DD/MM/AAAA (Ejemplo: 15/08/1990)
Escribe la nueva fecha o *SALTAR* para mantenerla`;
  }
  
  const validation = guestValidator.validatePhone(messageText);
  
  if (!validation.valid) {
    return validation.message;
  }

  session.data.phone = validation.phone;
  await whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_BIRTHDATE,
    data: session.data
  });

  const birthdateDisplay = session.data.birthdate || 'No registrado';
  
  const nextPrompt = session.data.isUpdatingExistingGuest
    ? `Actual: *${birthdateDisplay}*\n\nFormato: DD/MM/AAAA (Ejemplo: 15/08/1990)\nEscribe la nueva fecha o *SALTAR* para mantenerla`
    : 'Formato: DD/MM/AAAA\nEjemplo: 15/08/1990';

  return `✅ Teléfono registrado

📅 ¿Cuál es tu *fecha de nacimiento*?

${nextPrompt}`;
}

/**
 * Capturar fecha de nacimiento
 */
async function handleBirthdateState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  // Permitir saltar si está en modo actualización
  if (session.data.isUpdatingExistingGuest && (normalized === 'saltar' || normalized === 'omitir')) {
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_GENDER,
      data: session.data
    });
    
    const genderDisplay = session.data.gender 
      ? session.data.gender
      : 'No registrado';
    
    return `✅ Fecha de nacimiento mantenida

👤 ¿Cuál es tu *género*?

Actual: *${genderDisplay}*

1️⃣ Hombre
2️⃣ Mujer
3️⃣ Otro

Responde con el número de tu opción o *SALTAR* para mantenerlo`;
  }
  
  const input = messageText.trim();
  
  // Validar formato DD/MM/AAAA
  const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = input.match(dateRegex);
  
  if (!match) {
    return `❌ Formato incorrecto.\n\nPor favor ingresa tu fecha de nacimiento en formato DD/MM/AAAA\nEjemplo: 15/08/1990`;
  }
  
  const [, day, month, year] = match;
  const birthDate = new Date(year, month - 1, day);
  
  // Validar que sea una fecha válida
  if (isNaN(birthDate.getTime())) {
    return `❌ Fecha inválida.\n\nPor favor ingresa una fecha válida.\nEjemplo: 15/08/1990`;
  }
  
  // Validar que no sea una fecha futura
  if (birthDate > new Date()) {
    return `❌ La fecha de nacimiento no puede ser en el futuro.`;
  }
  
  // Validar edad mínima (18 años)
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();
  const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
  
  if (actualAge < 18) {
    return `❌ Debes ser mayor de 18 años para hacer una reserva.`;
  }

  session.data.birthdate = input;
  await whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_GENDER,
    data: session.data
  });

  const genderDisplay = session.data.gender || 'No registrado';
  
  const nextPrompt = session.data.isUpdatingExistingGuest
    ? `Actual: *${genderDisplay}*\n\n1️⃣ Hombre\n2️⃣ Mujer\n3️⃣ Otro\n\nResponde con el número o *SALTAR* para mantenerlo`
    : '1️⃣ Hombre\n2️⃣ Mujer\n3️⃣ Otro\n\nResponde con el número de tu opción.';

  return `✅ Fecha de nacimiento registrada

👤 ¿Cuál es tu *género*?

${nextPrompt}`;
}

/**
 * Capturar género
 */
async function handleGenderState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  // Permitir saltar si está en modo actualización
  if (session.data.isUpdatingExistingGuest && (normalized === 'saltar' || normalized === 'omitir')) {
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_COUNTRY,
      data: session.data
    });
    
    const countryDisplay = session.data.country 
      ? session.data.country
      : 'No registrado';
    
    return `✅ Género mantenido

🌎 ¿De qué *país* eres?

Actual: *${countryDisplay}*

Escribe el nombre del país o *SALTAR* para mantenerlo`;
  }
  
  const input = messageText.trim().toLowerCase();
  let gender = '';
  
  if (input === '1' || input.includes('hombre') || input.includes('masculino')) {
    gender = 'Masculino';
  } else if (input === '2' || input.includes('mujer') || input.includes('femenino')) {
    gender = 'Femenino';
  } else if (input === '3' || input.includes('otro')) {
    gender = 'Otro';
  } else {
    return `❌ Opción inválida.\n\nPor favor responde:\n1️⃣ Hombre\n2️⃣ Mujer\n3️⃣ Otro`;
  }

  session.data.gender = gender;
  await whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_COUNTRY,
    data: session.data
  });

  const countryDisplay = session.data.country || 'No registrado';
  
  const nextPrompt = session.data.isUpdatingExistingGuest
    ? `Actual: *${countryDisplay}*\n\nEscribe el nombre del país o *SALTAR* para mantenerlo`
    : 'Ejemplo: Chile, Argentina, Perú, etc.';

  return `✅ Género registrado: ${gender}

🌎 ¿De qué *país* eres?

${nextPrompt}`;
}

/**
 * Capturar país
 */
async function handleCountryState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  // Permitir saltar si está en modo actualización
  if (session.data.isUpdatingExistingGuest && (normalized === 'saltar' || normalized === 'omitir')) {
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_REGION,
      data: session.data
    });
    
    const regionDisplay = session.data.region 
      ? session.data.region
      : 'No registrado';
    
    return `✅ País mantenido

📍 ¿De qué *región* eres?

Actual: *${regionDisplay}*

Escribe el nombre de la región o *SALTAR* para mantenerla`;
  }
  
  const country = messageText.trim();
  
  if (country.length < 2) {
    return `❌ Por favor ingresa un país válido.`;
  }

  session.data.country = country;
  await whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_REGION,
    data: session.data
  });

  const regionDisplay = session.data.region || 'No registrado';
  
  const nextPrompt = session.data.isUpdatingExistingGuest
    ? `Actual: *${regionDisplay}*\n\nEscribe el nombre de la región o *SALTAR* para mantenerla`
    : 'Ejemplo: Metropolitana, Valparaíso, Biobío, etc.';

  return `✅ País registrado: ${country}

📍 ¿De qué *región* eres?

${nextPrompt}`;
}

/**
 * Capturar región
 */
async function handleRegionState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  // Permitir saltar si está en modo actualización
  if (session.data.isUpdatingExistingGuest && (normalized === 'saltar' || normalized === 'omitir')) {
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_CITY,
      data: session.data
    });
    
    const cityDisplay = session.data.city 
      ? session.data.city
      : 'No registrado';
    
    return `✅ Región mantenida

🏙️ ¿De qué *ciudad* eres?

Actual: *${cityDisplay}*

Escribe el nombre de la ciudad o *SALTAR* para mantenerla`;
  }
  
  const region = messageText.trim();
  
  if (region.length < 2) {
    return `❌ Por favor ingresa una región válida.`;
  }

  session.data.region = region;
  await whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_CITY,
    data: session.data
  });

  const cityDisplay = session.data.city || 'No registrado';
  
  const nextPrompt = session.data.isUpdatingExistingGuest
    ? `Actual: *${cityDisplay}*\n\nEscribe el nombre de la ciudad o *SALTAR* para mantenerla`
    : 'Ejemplo: Santiago, Valparaíso, Concepción, etc.';

  return `✅ Región registrada: ${region}

🏙️ ¿De qué *ciudad* eres?

${nextPrompt}`;
}

/**
 * Capturar ciudad
 */
async function handleCityState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  // Permitir saltar si está en modo actualización
  if (session.data.isUpdatingExistingGuest && (normalized === 'saltar' || normalized === 'omitir')) {
    // Mantener ciudad actual y finalizar actualización
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_CONFIRMATION,
      data: session.data
    });
    
    return `✅ Ciudad mantenida

📋 *Datos personales actualizados*

Tus datos han sido actualizados. A continuación verás el resumen de tu reserva.

${getConfirmationMessage(session.data)}`;
  }
  
  const city = messageText.trim();
  
  if (city.length < 2) {
    const hint = session.data.isUpdatingExistingGuest 
      ? ' o escribe *SALTAR* para mantener el actual' 
      : '';
    return `❌ Por favor ingresa una ciudad válida${hint}.`;
  }

  session.data.city = city;
  
  // Si está actualizando, ir directo a confirmación (sin solicitudes especiales)
  if (session.data.isUpdatingExistingGuest) {
    const confirmationMsg = getConfirmationMessage(session.data);

    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_CONFIRMATION,
      data: session.data
    });

    return `✅ Ciudad actualizada: ${city}

📋 *Datos personales actualizados*

Tus datos han sido actualizados. A continuación verás el resumen de tu reserva.

${confirmationMsg}`;
  }
  
  // Si es un nuevo registro (foundGuest es null), ir a método de pago
  if (!session.data.foundGuest) {
    console.log('🔍 DEBUG handleCityState - totalGuests:', session.data.totalGuests, 'adults:', session.data.adults, 'children:', session.data.childrenUnder4);
    
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_PAYMENT_METHOD,
      data: session.data
    });

    return `✅ Ciudad registrada: ${city}

📝 *Datos personales completados*

💳 *Método de Pago*

¿Cómo deseas realizar el pago?

1️⃣ *EFECTIVO* - Pago presencial en el hotel
2️⃣ *TRANSFERENCIA* - Pago por transferencia bancaria

Responde con el número de tu opción.`;
  }
  
  // Si el huésped ya estaba registrado (foundGuest existe), ir a solicitudes especiales
  await whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_SPECIAL_REQUESTS,
    data: session.data
  });

  return `✅ Ciudad registrada: ${city}

💬 *Solicitudes Especiales (Opcional)*

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
  
  await whatsappService.updateSession(phoneNumber, {
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
  
  await whatsappService.updateSession(phoneNumber, {
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
  
  await whatsappService.updateSession(phoneNumber, {
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
    await whatsappService.updateSession(phoneNumber, {
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
    
    await whatsappService.updateSession(phoneNumber, {
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
  
  await whatsappService.updateSession(phoneNumber, {
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
  
  await whatsappService.updateSession(phoneNumber, {
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
  
  await whatsappService.updateSession(phoneNumber, {
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
  
  await whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_SPECIAL_REQUESTS,
    data: session.data
  });

  return `✅ Habitación seleccionada: *${session.data.roomTypeName}* - Habitación ${session.data.roomNumber}
📋 Capacidad: ${session.data.roomInfo.base_capacity || session.data.roomInfo.capacity} persona(s)

� *Paso 3: Solicitudes Especiales*

¿Tienes alguna *solicitud especial*?

Ejemplos: Vista al mar, Piso alto/bajo, Cama adicional

Escribe tu solicitud o *NO* si no tienes ninguna.`;
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
  
  await whatsappService.updateSession(phoneNumber, {
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
  // Si la sesión ya fue completada, evitar procesar de nuevo
  if (session.completed) {
    return null; // Ya fue procesada, esperar a que se limpie
  }

  const normalized = messageText.toLowerCase().trim();

  if (normalized === 'si' || normalized === 'sí' || normalized === 'confirmar' || normalized === '1') {
    // Marcar sesión como completada y cambiar estado para evitar re-procesamiento
    await whatsappService.updateSession(phoneNumber, {
      state: 'COMPLETED', // Cambiar estado para evitar re-entrada
      completed: true,
      data: session.data
    });

    return null; // El controller enviará el mensaje de confirmación
  }

  if (normalized === 'no' || normalized === 'cancelar' || normalized === '2') {
    await whatsappService.updateSession(phoneNumber, {
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
 * Capturar método de pago
 */
async function handlePaymentMethodState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  if (normalized === '1' || normalized === 'efectivo') {
    // Pago en efectivo
    session.data.paymentMethod = 'efectivo';
    
    // Verificar si hay huéspedes adicionales
    const totalGuests = session.data.totalGuests || 1;
    const adults = session.data.adults || 1;
    
    if (adults > 1) {
      // Hay más de 1 adulto, preguntar por huéspedes adicionales
      await whatsappService.updateSession(phoneNumber, {
        state: STATES.AWAITING_ADDITIONAL_GUESTS_CHOICE,
        data: session.data
      });
      
      return `✅ *Método de pago: Efectivo (presencial)*

---

👥 ¿Deseas registrar los datos de los *huéspedes adicionales* a tu reserva?

Responde:
• *CONTINUAR* - Para registrar sus datos
• *OMITIR* - Para saltar este paso`;
    } else {
      // Solo 1 adulto, ir directo a confirmación
      // Generar mensaje ANTES de actualizar sesión
      const confirmationMsg = getConfirmationMessage(session.data);

      await whatsappService.updateSession(phoneNumber, {
        state: STATES.AWAITING_CONFIRMATION,
        data: session.data
      });

      return `✅ *Método de pago: Efectivo (presencial)*

${confirmationMsg}`;
    }
  }
  
  if (normalized === '2' || normalized === 'transferencia') {
    // Pago por transferencia - Preguntar opción
    session.data.paymentMethod = 'transferencia';
    
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_TRANSFER_OPTION,
      data: session.data
    });
    
    const nights = session.data.nights || 1;
    const roomPrice = session.data.roomInfo?.price || 0;
    const roomTotal = roomPrice * nights;
    
    let servicesTotal = 0;
    if (session.data.services && session.data.services.breakfast) {
      const breakfastQty = session.data.services.breakfastQuantity || 0;
      const breakfastPrice = 3000;
      servicesTotal = breakfastPrice * breakfastQty * nights;
    }
    
    const total = roomTotal + servicesTotal;
    const mitad = Math.round(total * 0.5);
    const primeraNoche = roomPrice;
    
    return `💳 *Transferencia Bancaria*

Selecciona el monto a pagar:

1️⃣ *TOTAL* - $${total.toLocaleString()}
2️⃣ *50%* - $${mitad.toLocaleString()}
3️⃣ *PRIMERA NOCHE* - $${primeraNoche.toLocaleString()}

Responde con el número de tu opción.`;
  }
  
  return `❌ Por favor, selecciona una opción válida:

1️⃣ *EFECTIVO*
2️⃣ *TRANSFERENCIA*`;
}

/**
 * Capturar opción de transferencia y mostrar datos bancarios
 */
async function handleTransferOptionState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  const nights = session.data.nights || 1;
  const roomPrice = session.data.roomInfo?.price || 0;
  const roomTotal = roomPrice * nights;
  
  let servicesTotal = 0;
  if (session.data.services && session.data.services.breakfast) {
    const breakfastQty = session.data.services.breakfastQuantity || 0;
    const breakfastPrice = 3000;
    servicesTotal = breakfastPrice * breakfastQty * nights;
  }
  
  const total = roomTotal + servicesTotal;
  const mitad = Math.round(total * 0.5);
  const primeraNoche = roomPrice;
  
  let amountToPay = 0;
  let paymentOption = '';
  
  if (normalized === '1' || normalized === 'total') {
    amountToPay = total;
    paymentOption = 'Total';
    session.data.transferAmount = total;
    session.data.transferOption = 'total';
  } else if (normalized === '2' || normalized === '50%' || normalized === 'mitad') {
    amountToPay = mitad;
    paymentOption = '50%';
    session.data.transferAmount = mitad;
    session.data.transferOption = '50%';
  } else if (normalized === '3' || normalized === 'primera noche') {
    amountToPay = primeraNoche;
    paymentOption = 'Primera noche';
    session.data.transferAmount = primeraNoche;
    session.data.transferOption = 'primera_noche';
  } else {
    return `❌ Por favor, selecciona una opción válida:

1️⃣ *TOTAL* - $${total.toLocaleString()}
2️⃣ *50%* - $${mitad.toLocaleString()}
3️⃣ *PRIMERA NOCHE* - $${primeraNoche.toLocaleString()}`;
  }
  
  // Guardar datos bancarios en mensaje para mostrar después
  const datosBancarios = `✅ *Opción seleccionada: ${paymentOption}*
💰 *Monto a transferir: $${amountToPay.toLocaleString()}*

---

🏦 *Datos para Transferencia*

📌 *Nombre:* Hotel Don Teo
📌 *RUT:* 77.123.456-7
📌 *Banco:* Banco de Chile
📌 *Tipo de Cuenta:* Cuenta Corriente
📌 *Número de Cuenta:* 1234567890
📌 *Email:* pagos@hoteldonteo.cl

⚠️ *IMPORTANTE:*
• Indica tu nombre completo y número de habitación en el asunto
• Tu reserva quedará confirmada una vez validemos el pago`;

  session.data.transferBankData = datosBancarios;
  
  // Verificar si hay huéspedes adicionales
  const adults = session.data.adults || 1;
  
  if (adults > 1) {
    // Hay más de 1 adulto, enviar datos bancarios primero y luego preguntar por huéspedes
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_ADDITIONAL_GUESTS_CHOICE,
      data: session.data
    });
    
    // Enviar datos bancarios primero (con el sufijo de WhatsApp)
    await whatsappService.sendMessage(`${phoneNumber}@s.whatsapp.net`, datosBancarios);
    
    // Esperar un momento y enviar la pregunta de huéspedes adicionales por separado
    return `👥 ¿Deseas registrar los datos de los *huéspedes adicionales* a tu reserva?

Responde:
• *CONTINUAR* - Para registrar sus datos
• *OMITIR* - Para saltar este paso`;
  } else {
    // Solo 1 adulto, ir directo a confirmación
    // Generar mensaje ANTES de actualizar sesión
    const confirmationMsg = getConfirmationMessage(session.data);

    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_CONFIRMATION,
      data: session.data
    });

    return `${datosBancarios}

---

${confirmationMsg}`;
  }
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

  // Huéspedes adicionales - Solo mostrar adultos
  let additionalGuestsText = '\n   Ninguno';
  if (data.additionalGuests && data.additionalGuests.length > 0) {
    // Filtrar solo adultos
    const adultGuests = data.additionalGuests.filter(guest => !guest.isChild);
    
    if (adultGuests.length > 0) {
      const guestsList = adultGuests.map((guest, index) => {
        return `${index + 2}. ${guest.name}\n     RUT: ${guest.rut || guest.passport}\n     Email: ${guest.email || 'No proporcionado'}\n     Teléfono: ${guest.phone || 'No proporcionado'}`;
      });
      additionalGuestsText = '\n   ' + guestsList.join('\n   ');
    }
  }
  
  const adultsText = data.adults ? `${data.adults} adulto(s)` : '';
  const childrenText = data.childrenUnder4 > 0 ? `, ${data.childrenUnder4} niño(s)` : '';

  // Calcular total
  const totalReservation = roomTotal + servicesTotal;

  // Texto de piso
  const floorText = data.selectedFloor !== undefined && data.selectedFloor !== null 
    ? (data.selectedFloor === 0 ? 'Planta baja' : `Piso ${data.selectedFloor}`)
    : 'Por asignar';

  // Información de pago
  let paymentText = '\n   No especificado';
  if (data.paymentMethod) {
    if (data.paymentMethod === 'efectivo') {
      paymentText = '\n   💵 *Efectivo* (Pago presencial)';
    } else if (data.paymentMethod === 'transferencia') {
      const transferOptionText = 
        data.transferOption === 'total' ? 'Pago Total' :
        data.transferOption === '50%' ? 'Anticipo 50%' :
        data.transferOption === 'primera_noche' ? 'Primera Noche' : 'N/A';
      
      paymentText = `\n   🏦 *Transferencia Bancaria*\n   • Opción: ${transferOptionText}\n   • Monto a transferir: $${data.transferAmount?.toLocaleString() || 'N/A'}`;
    }
  }

  return `📋 *Resumen de tu reserva*

👤 *Huésped Principal:*
   • Nombre: ${data.name}
   • RUT: ${data.rut}
   • Email: ${data.email}
   • Teléfono: ${data.phone}
   • Fecha de Nacimiento: ${data.birthdate || 'No especificada'}
   • Género: ${data.gender || 'No especificado'}
   • País: ${data.country || 'No especificado'}
   • Región: ${data.region || 'No especificada'}
   • Ciudad: ${data.city || 'No especificada'}

🏨 *Detalles de la reserva:*
   • Entrada: ${data.checkInDateFormatted}
   • Salida: ${data.checkOutDateFormatted}
   • Noches: ${nights}
   • Habitación: ${data.roomTypeName || data.roomInfo?.name || 'N/A'}
   • Número de habitación: ${data.roomNumber || 'Por asignar'}
   • Piso: ${floorText}
   • Huéspedes: ${adultsText}${childrenText}

💳 *Método de Pago:*${paymentText}

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
    // No agregar servicios, ir a verificación de registro
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_IS_CHILEAN,
      data: session.data
    });
    
    return `🌎 *Paso 4: Verificación de Registro*

¿Eres de Chile?

Responde:
1️⃣ *SÍ* - Soy chileno(a)
2️⃣ *NO* - Soy extranjero(a)`;
  }
  
  if (normalized === '1' || normalized.includes('lavand')) {
    // Solo lavandería
    session.data.services.laundry = true;
    await whatsappService.updateSession(phoneNumber, {
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
    await whatsappService.updateSession(phoneNumber, {
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
    await whatsappService.updateSession(phoneNumber, {
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
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_BREAKFAST,
      data: session.data
    });
    return `✅ Lavandería: ${quantity} prenda(s)

Ahora, ¿cuántos desayunos necesitas por día?

Ingresa un número (ejemplo: 2)`;
  }
  
  // Si no hay desayuno, ir a verificación de registro
  await whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_IS_CHILEAN,
    data: session.data
  });
  
  return `✅ Lavandería: ${quantity} prenda(s) registrada(s)

🌎 *Paso 4: Verificación de Registro*

¿Eres de Chile?

Responde:
1️⃣ *SÍ* - Soy chileno(a)
2️⃣ *NO* - Soy extranjero(a)`;
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
  
  await whatsappService.updateSession(phoneNumber, {
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
  
  await whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_IS_CHILEAN,
    data: session.data
  });
  
  const preferencesText = session.data.services.breakfastPreferences.join(', ');
  
  return `✅ Preferencias de desayuno registradas: ${preferencesText}

🌎 *Paso 4: Verificación de Registro*

¿Eres de Chile?

Responde:
1️⃣ *SÍ* - Soy chileno(a)
2️⃣ *NO* - Soy extranjero(a)`;
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
  const adults = session.data.adults || 1;
  const additionalGuestsNeeded = adults - 1; // Solo contar adultos adicionales
  
  // Si solo hay 1 adulto, ir directo a confirmación
  if (additionalGuestsNeeded === 0) {
    await whatsappService.updateSession(phoneNumber, {
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
    
    const childrenUnder4 = session.data.childrenUnder4 || 0;
    const adultsNeeded = additionalGuestsNeeded; // Ya calculado correctamente arriba (adults - 1)
    
    // Si solo hay niños, registrarlos automáticamente sin pedir datos
    if (adultsNeeded === 0 && childrenUnder4 > 0) {
      // Registrar todos los niños automáticamente
      for (let i = 0; i < childrenUnder4; i++) {
        session.data.additionalGuests.push({
          name: null,
          rut: null,
          isChild: true,
          email: null,
          phone: null
        });
      }
      
      await whatsappService.updateSession(phoneNumber, {
        state: STATES.AWAITING_CONFIRMATION,
        data: session.data
      });
      
      return `✅ ${childrenUnder4} niño(s) registrado(s) automáticamente

${getConfirmationMessage(session.data)}`;
    }
    
    // Si hay niños, registrarlos automáticamente primero
    if (childrenUnder4 > 0) {
      for (let i = 0; i < childrenUnder4; i++) {
        session.data.additionalGuests.push({
          name: null,
          rut: null,
          isChild: true,
          email: null,
          phone: null
        });
      }
      session.data.currentChildGuest = childrenUnder4;
    }
    
    // Ahora procesar adultos adicionales
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_ADDITIONAL_GUEST_CHOICE,
      data: session.data
    });
    
    return `${childrenUnder4 > 0 ? `✅ ${childrenUnder4} niño(s) registrado(s) automáticamente\n\n` : ''}📝 *Huésped adulto ${session.data.currentAdultGuest + 1}*

¿Deseas registrar los datos de este huésped?

Responde:
• *REGISTRAR* - Para ingresar sus datos
• *OMITIR* - Para saltarlo`;
  }
  
  if (normalized === 'omitir' || normalized === 'saltar' || normalized === 'no') {
    // Omitir todos los huéspedes adicionales
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_CONFIRMATION,
      data: session.data
    });
    return `✅ Huéspedes adicionales omitidos.

${getConfirmationMessage(session.data)}`;
  }
  
  return `❌ Por favor responde:
• *CONTINUAR* - Registrar huéspedes adicionales
• *OMITIR* - Continuar sin registrar huéspedes adicionales`;
}

/**
 * Preguntar si desea registrar cada adulto adicional
 */
async function handleAdditionalGuestChoiceState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  if (normalized === 'registrar' || normalized === 'si' || normalized === 'sí') {
    // Primero preguntar si es chileno o extranjero
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_ADDITIONAL_GUEST_IS_CHILEAN,
      data: session.data
    });
    
    return `📝 *Huésped adulto ${session.data.currentAdultGuest + 1}*

¿Este huésped es chileno o extranjero?

Responde:
1️⃣ *Chileno(a)*
2️⃣ *Extranjero(a)*`;
  }
  
  if (normalized === 'omitir' || normalized === 'saltar' || normalized === 'no') {
    // Omitir este adulto
    session.data.currentAdultGuest++;
    
    const adults = session.data.adults || 1;
    const adultsNeeded = adults - 1;
    const remaining = adultsNeeded - session.data.currentAdultGuest;
    
    if (remaining > 0) {
      await whatsappService.updateSession(phoneNumber, {
        state: STATES.AWAITING_ADDITIONAL_GUEST_CHOICE,
        data: session.data
      });
      
      return `✅ Huésped omitido

📝 *Huésped adulto ${session.data.currentAdultGuest + 1}*

¿Deseas registrar los datos de este huésped?

Responde:
• *REGISTRAR* - Para ingresar sus datos
• *OMITIR* - Para saltarlo`;
    } else {
      await whatsappService.updateSession(phoneNumber, {
        state: STATES.AWAITING_CONFIRMATION,
        data: session.data
      });

      return `✅ Registro completado

${getConfirmationMessage(session.data)}`;
    }
  }
  
  return `❌ Por favor responde:
• *REGISTRAR* - Para ingresar los datos
• *OMITIR* - Para saltarlo`;
}

/**
 * Preguntar si el huésped adicional es chileno o extranjero
 */
async function handleAdditionalGuestIsChileanState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  if (normalized === '1' || normalized.includes('chileno')) {
    session.data.currentAdditionalGuestIsChilean = true;
    
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_ADDITIONAL_GUEST_REGISTRATION_CHECK,
      data: session.data
    });
    
    return `🆔 Por favor, ingresa el *RUT* de este huésped para verificar si está registrado:

Ejemplo: 12.345.678-9 o 12345678-9`;
  }
  
  if (normalized === '2' || normalized.includes('extranjero')) {
    session.data.currentAdditionalGuestIsChilean = false;
    
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_ADDITIONAL_GUEST_REGISTRATION_CHECK,
      data: session.data
    });
    
    return `🛂 Por favor, ingresa el *Pasaporte* de este huésped para verificar si está registrado:

Ejemplo: AB123456`;
  }
  
  return `❌ Por favor responde:
1️⃣ *Chileno(a)*
2️⃣ *Extranjero(a)*`;
}

/**
 * Verificar si el huésped adicional está registrado en la BD
 */
async function handleAdditionalGuestRegistrationCheckState(session, messageText, phoneNumber) {
  const input = messageText.trim();
  
  let guest = null;
  let idType = '';
  
  if (session.data.currentAdditionalGuestIsChilean) {
    // Validar RUT
    const validation = guestValidator.validateRut(input);
    if (!validation.valid) {
      return validation.message;
    }
    
    const formattedRut = validation.rut;
    const normalizedRut = formattedRut.replace(/\./g, '');
    idType = 'RUT';
    
    try {
      guest = await whatsappService.findGuestByRut(normalizedRut);
      session.data.currentAdditionalGuestRut = formattedRut;
    } catch (error) {
      console.error('Error al buscar huésped adicional por RUT:', error);
      return `❌ Hubo un error al verificar los datos. Por favor, intenta nuevamente.`;
    }
  } else {
    // Validar Pasaporte
    if (input.length < 5 || input.length > 20) {
      return `❌ El pasaporte debe tener entre 5 y 20 caracteres. Por favor, inténtalo nuevamente.`;
    }
    
    const normalizedPassport = input.toUpperCase();
    idType = 'Pasaporte';
    
    try {
      guest = await whatsappService.findGuestByPassport(normalizedPassport);
      session.data.currentAdditionalGuestPassport = normalizedPassport;
    } catch (error) {
      console.error('Error al buscar huésped adicional por Pasaporte:', error);
      return `❌ Hubo un error al verificar los datos. Por favor, intenta nuevamente.`;
    }
  }
  
  if (guest) {
    // Huésped adicional encontrado - Autocompletar
    session.data.currentAdditionalGuestFound = guest;
    
    const fullName = `${guest.first_name} ${guest.paternal_last_name}${guest.maternal_last_name ? ' ' + guest.maternal_last_name : ''}`;
    
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_ADDITIONAL_GUEST_FOUND_CONFIRMATION,
      data: session.data
    });
    
    let dataMessage = `✅ *¡Huésped encontrado en el sistema!*

🙋 *Datos registrados:*
• Nombre: *${fullName}*`;
    
    if (guest.email) dataMessage += `\n• Email: *${guest.email}*`;
    if (guest.phone_number) dataMessage += `\n• Teléfono: *${guest.phone_number}*`;
    if (guest.birth_date) dataMessage += `\n• Fecha de Nacimiento: *${new Date(guest.birth_date).toLocaleDateString('es-CL')}*`;
    if (guest.gender) dataMessage += `\n• Género: *${guest.gender}*`;
    if (guest.country) dataMessage += `\n• País: *${guest.country}*`;
    if (guest.region) dataMessage += `\n• Región: *${guest.region}*`;
    if (guest.city) dataMessage += `\n• Ciudad: *${guest.city}*`;
    
    dataMessage += `\n\n¿Deseas usar estos datos?

Responde:
1️⃣ *SÍ* - Usar estos datos
2️⃣ *NO* - Ingresar datos manualmente`;
    
    return dataMessage;
  } else {
    // Huésped adicional NO encontrado - Pedir RUT/Pasaporte completo primero
    session.data.currentAdditionalGuestFound = null;
    
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_ADDITIONAL_GUEST_RUT,
      data: session.data
    });
    
    const idLabel = session.data.currentAdditionalGuestIsChilean ? 'RUT' : 'Pasaporte';
    const example = session.data.currentAdditionalGuestIsChilean ? '12.345.678-9' : 'AB123456';
    
    return `📝 *No encontramos este ${idType} en el sistema*

Por favor, ingresa el *${idLabel} completo* de este huésped para el registro:

Ejemplo: ${example}`;
  }
}

/**
 * Confirmar uso de datos del huésped adicional encontrado
 */
async function handleAdditionalGuestFoundConfirmationState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  if (normalized === '1' || normalized === 'si' || normalized === 'sí') {
    // Usar datos autocompletados
    const guest = session.data.currentAdditionalGuestFound;
    const fullName = `${guest.first_name} ${guest.paternal_last_name}${guest.maternal_last_name ? ' ' + guest.maternal_last_name : ''}`;
    
    const rut = session.data.currentAdditionalGuestIsChilean 
      ? session.data.currentAdditionalGuestRut
      : null;
    const passport = !session.data.currentAdditionalGuestIsChilean
      ? session.data.currentAdditionalGuestPassport
      : null;
    
    session.data.additionalGuests.push({
      name: fullName,
      rut: rut,
      passport: passport,
      isChild: false,
      email: guest.email,
      phone: guest.phone_number,
      birthdate: guest.birth_date ? new Date(guest.birth_date).toISOString().split('T')[0] : null,
      gender: guest.gender,
      country: guest.country,
      region: guest.region,
      city: guest.city
    });
    
    session.data.currentAdultGuest++;
    session.data.currentAdditionalGuestFound = null;
    
    const adults = session.data.adults || 1;
    const adultsNeeded = adults - 1;
    const remaining = adultsNeeded - session.data.currentAdultGuest;
    
    if (remaining > 0) {
      await whatsappService.updateSession(phoneNumber, {
        state: STATES.AWAITING_ADDITIONAL_GUEST_CHOICE,
        data: session.data
      });
      
      return `✅ Huésped registrado: ${fullName}

📝 *Huésped adulto ${session.data.currentAdultGuest + 1}*

¿Deseas registrar los datos de este huésped?

Responde:
• *REGISTRAR* - Para ingresar sus datos
• *OMITIR* - Para saltarlo`;
    } else {
      await whatsappService.updateSession(phoneNumber, {
        state: STATES.AWAITING_CONFIRMATION,
        data: session.data
      });
      
      return `✅ Todos los huéspedes registrados

${getConfirmationMessage(session.data)}`;
    }
  }
  
  if (normalized === '2' || normalized === 'no') {
    // No usar datos - Pedir RUT/Pasaporte primero
    session.data.currentAdditionalGuestFound = null;
    
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_ADDITIONAL_GUEST_RUT,
      data: session.data
    });
    
    const idLabel = session.data.currentAdditionalGuestIsChilean ? 'RUT' : 'Pasaporte';
    const example = session.data.currentAdditionalGuestIsChilean ? '12.345.678-9' : 'AB123456';
    
    return `📝 Por favor, ingresa el *${idLabel} completo* de este huésped:

Ejemplo: ${example}`;
  }
  
  return `❌ Por favor responde:
1️⃣ *SÍ* - Usar los datos encontrados
2️⃣ *NO* - Ingresar datos manualmente`;
}

/**
 * Capturar nombre de huésped adicional
 */
async function handleAdditionalGuestNameState(session, messageText, phoneNumber) {
  const validation = guestValidator.validateName(messageText);
  
  if (!validation.valid) {
    return validation.message;
  }

  // Guardar temporalmente el nombre
  session.data.tempAdditionalGuest.name = validation.name;
  
  // Continuar con email
  await whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_ADDITIONAL_GUEST_EMAIL,
    data: session.data
  });
  
  return `✅ Nombre registrado: ${validation.name}

📧 ¿Cuál es el *correo electrónico* de este huésped?

Ejemplo: correo@ejemplo.com
(Escribe *OMITIR* para saltar)`;
}

/**
 * Capturar RUT de huésped adicional (con validación de duplicados)
 */
async function handleAdditionalGuestRutState(session, messageText, phoneNumber) {
  const input = messageText.trim();
  
  // Validar RUT o Pasaporte según corresponda
  if (session.data.currentAdditionalGuestIsChilean) {
    // Validar RUT
    const validation = guestValidator.validateRut(input);
    
    if (!validation.valid) {
      return validation.message;
    }
    
    // Normalizar RUT para comparación (sin puntos)
    const normalizedRutInput = validation.rut.replace(/\./g, '');
    const normalizedMainRut = session.data.rut ? session.data.rut.replace(/\./g, '') : null;
    
    // Validar que no sea el mismo RUT del huésped principal
    if (normalizedRutInput === normalizedMainRut) {
      return `❌ Este RUT pertenece al huésped principal.

Por favor ingresa un RUT diferente.`;
    }
    
    // Validar que no haya duplicados en huéspedes adicionales
    const isDuplicate = session.data.additionalGuests?.some(
      guest => {
        const guestRut = guest.rut ? guest.rut.replace(/\./g, '') : null;
        return guestRut === normalizedRutInput;
      }
    );
    
    if (isDuplicate) {
      return `❌ Este RUT ya fue registrado para otro huésped.

Por favor ingresa un RUT diferente.`;
    }
    
    session.data.tempAdditionalGuest = {
      rut: validation.rut,
      passport: null,
      isChild: false
    };
    
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_ADDITIONAL_GUEST_NAME,
      data: session.data
    });
    
    return `✅ RUT registrado: ${validation.rut}

👤 ¿Cuál es el *nombre completo* de este huésped?

Ejemplo: Juan Pérez González`;
  } else {
    // Validar Pasaporte
    if (input.length < 5 || input.length > 20) {
      return `❌ El pasaporte debe tener entre 5 y 20 caracteres. Por favor, inténtalo nuevamente.`;
    }
    
    const normalizedPassport = input.toUpperCase();
    
    // Validar que no sea el mismo pasaporte del huésped principal
    if (normalizedPassport === session.data.passport) {
      return `❌ Este Pasaporte pertenece al huésped principal.

Por favor ingresa un Pasaporte diferente.`;
    }
    
    // Validar que no haya duplicados en huéspedes adicionales
    const isDuplicate = session.data.additionalGuests?.some(
      guest => guest.passport === normalizedPassport
    );
    
    if (isDuplicate) {
      return `❌ Este Pasaporte ya fue registrado para otro huésped.

Por favor ingresa un Pasaporte diferente.`;
    }
    
    session.data.tempAdditionalGuest = {
      rut: null,
      passport: normalizedPassport,
      isChild: false
    };
    
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_ADDITIONAL_GUEST_NAME,
      data: session.data
    });
    
    return `✅ Pasaporte registrado: ${normalizedPassport}

👤 ¿Cuál es el *nombre completo* de este huésped?

Ejemplo: John Smith`;
  }
}

/**
 * Capturar email de huésped adicional (OPCIONAL)
 */
async function handleAdditionalGuestEmailState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  // Permitir omitir email
  if (normalized === 'omitir' || normalized === 'saltar') {
    session.data.tempAdditionalGuest.email = null;
    
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_ADDITIONAL_GUEST_PHONE,
      data: session.data
    });
    
    return `✅ Email omitido

¿Cuál es su *número de teléfono*?

Formato: +56912345678
(Escribe OMITIR para saltar)`;
  }
  
  const validation = guestValidator.validateEmail(messageText);
  
  if (!validation.valid) {
    return validation.message + `

_Escribe *OMITIR* si prefieres no proporcionar esta información_`;
  }
  
  session.data.tempAdditionalGuest.email = validation.email;
  
  await whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_ADDITIONAL_GUEST_PHONE,
    data: session.data
  });
  
  return `✅ Email registrado: ${validation.email}

¿Cuál es su *número de teléfono*?

Formato: +56912345678
(Escribe OMITIR para saltar)`;
}

/**
 * Capturar teléfono de huésped adicional (OPCIONAL - solo adultos)
 */
async function handleAdditionalGuestPhoneState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  // Permitir omitir teléfono y guardar con datos parciales
  if (normalized === 'omitir' || normalized === 'saltar') {
    session.data.tempAdditionalGuest.phone = null;
  } else {
    const validation = guestValidator.validatePhone(messageText);
    
    if (!validation.valid) {
      return validation.message + `

_Escribe *OMITIR* si prefieres no proporcionar esta información_`;
    }
    
    session.data.tempAdditionalGuest.phone = validation.phone;
  }
  
  // Continuar con fecha de nacimiento
  await whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_ADDITIONAL_GUEST_BIRTHDATE,
    data: session.data
  });
  
  return `${session.data.tempAdditionalGuest.phone ? `✅ Teléfono registrado: ${session.data.tempAdditionalGuest.phone}` : '✅ Teléfono omitido'}

¿Cuál es su *fecha de nacimiento*?

Formato: DD/MM/AAAA (ejemplo: 15/03/1990)
(Escribe OMITIR para saltar)`;
}

/**
 * Capturar fecha de nacimiento de huésped adicional (OPCIONAL)
 */
async function handleAdditionalGuestBirthdateState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  if (normalized === 'omitir' || normalized === 'saltar') {
    session.data.tempAdditionalGuest.birthdate = null;
  } else {
    const input = messageText.trim();
    
    // Validar formato DD/MM/AAAA
    const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = input.match(dateRegex);
    
    if (!match) {
      return `❌ Formato incorrecto.\n\nPor favor ingresa la fecha de nacimiento en formato DD/MM/AAAA\nEjemplo: 15/08/1990\n\n_Escribe *OMITIR* si prefieres no proporcionar esta información_`;
    }
    
    const [, day, month, year] = match;
    const birthDate = new Date(year, month - 1, day);
    
    // Validar que sea una fecha válida
    if (isNaN(birthDate.getTime())) {
      return `❌ Fecha inválida.\n\nPor favor ingresa una fecha válida.\nEjemplo: 15/08/1990\n\n_Escribe *OMITIR* si prefieres no proporcionar esta información_`;
    }
    
    // Validar que no sea una fecha futura
    if (birthDate > new Date()) {
      return `❌ La fecha de nacimiento no puede ser en el futuro.\n\n_Escribe *OMITIR* si prefieres no proporcionar esta información_`;
    }
    
    // Validar edad mínima (18 años)
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
    
    if (actualAge < 18) {
      return `❌ El huésped debe ser mayor de 18 años.\n\n_Escribe *OMITIR* si prefieres no proporcionar esta información_`;
    }
    
    session.data.tempAdditionalGuest.birthdate = input;
  }
  
  await whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_ADDITIONAL_GUEST_GENDER,
    data: session.data
  });
  
  return `${session.data.tempAdditionalGuest.birthdate ? `✅ Fecha de nacimiento registrada: ${session.data.tempAdditionalGuest.birthdate}` : '✅ Fecha de nacimiento omitida'}

¿Cuál es su *género*?

1️⃣ Hombre
2️⃣ Mujer
3️⃣ Otro

Responde con el número (o OMITIR para saltar)`;
}

/**
 * Capturar género de huésped adicional (OPCIONAL)
 */
async function handleAdditionalGuestGenderState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  if (normalized === 'omitir' || normalized === 'saltar') {
    session.data.tempAdditionalGuest.gender = null;
  } else {
    let gender = null;
    if (messageText.trim() === '1') {
      gender = 'Hombre';
    } else if (messageText.trim() === '2') {
      gender = 'Mujer';
    } else if (messageText.trim() === '3') {
      gender = 'Otro';
    } else {
      return `❌ Por favor selecciona una opción válida:

1️⃣ Hombre
2️⃣ Mujer
3️⃣ Otro

(o escribe OMITIR para saltar)`;
    }
    
    session.data.tempAdditionalGuest.gender = gender;
  }
  
  await whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_ADDITIONAL_GUEST_COUNTRY,
    data: session.data
  });
  
  return `${session.data.tempAdditionalGuest.gender ? `✅ Género registrado: ${session.data.tempAdditionalGuest.gender}` : '✅ Género omitido'}

¿En qué *país* reside?

(Escribe OMITIR para saltar)`;
}

/**
 * Capturar país de huésped adicional (OPCIONAL)
 */
async function handleAdditionalGuestCountryState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  if (normalized === 'omitir' || normalized === 'saltar') {
    session.data.tempAdditionalGuest.country = null;
  } else {
    if (messageText.trim().length < 2) {
      return `❌ Por favor ingresa un país válido (o OMITIR para saltar)`;
    }
    session.data.tempAdditionalGuest.country = messageText.trim();
  }
  
  await whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_ADDITIONAL_GUEST_REGION,
    data: session.data
  });
  
  return `${session.data.tempAdditionalGuest.country ? `✅ País registrado: ${session.data.tempAdditionalGuest.country}` : '✅ País omitido'}

¿En qué *región* reside?

(Escribe OMITIR para saltar)`;
}

/**
 * Capturar región de huésped adicional (OPCIONAL)
 */
async function handleAdditionalGuestRegionState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  if (normalized === 'omitir' || normalized === 'saltar') {
    session.data.tempAdditionalGuest.region = null;
  } else {
    if (messageText.trim().length < 2) {
      return `❌ Por favor ingresa una región válida (o OMITIR para saltar)`;
    }
    session.data.tempAdditionalGuest.region = messageText.trim();
  }
  
  await whatsappService.updateSession(phoneNumber, {
    state: STATES.AWAITING_ADDITIONAL_GUEST_CITY,
    data: session.data
  });
  
  return `${session.data.tempAdditionalGuest.region ? `✅ Región registrada: ${session.data.tempAdditionalGuest.region}` : '✅ Región omitida'}

¿En qué *ciudad* reside?

(Escribe OMITIR para saltar)`;
}

/**
 * Capturar ciudad de huésped adicional (OPCIONAL)
 */
async function handleAdditionalGuestCityState(session, messageText, phoneNumber) {
  const normalized = messageText.toLowerCase().trim();
  
  if (normalized === 'omitir' || normalized === 'saltar') {
    session.data.tempAdditionalGuest.city = null;
  } else {
    if (messageText.trim().length < 2) {
      return `❌ Por favor ingresa una ciudad válida (o OMITIR para saltar)`;
    }
    session.data.tempAdditionalGuest.city = messageText.trim();
  }
  
  // Ahora sí guardar el adulto con todos los datos
  session.data.additionalGuests.push({
    name: session.data.tempAdditionalGuest.name,
    rut: session.data.tempAdditionalGuest.rut || null,
    passport: session.data.tempAdditionalGuest.passport || null,
    email: session.data.tempAdditionalGuest.email,
    phone: session.data.tempAdditionalGuest.phone,
    birthdate: session.data.tempAdditionalGuest.birthdate,
    gender: session.data.tempAdditionalGuest.gender,
    country: session.data.tempAdditionalGuest.country,
    region: session.data.tempAdditionalGuest.region,
    city: session.data.tempAdditionalGuest.city,
    isChild: false
  });

  session.data.currentAdultGuest++;
  delete session.data.tempAdditionalGuest;
  
  const adults = session.data.adults || 1;
  const adultsNeeded = adults - 1;
  const remaining = adultsNeeded - session.data.currentAdultGuest;
  
  if (remaining > 0) {
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_ADDITIONAL_GUEST_CHOICE,
      data: session.data
    });
    
    return `✅ Huésped adulto registrado

📝 *Huésped adulto ${session.data.currentAdultGuest + 1}*

¿Deseas registrar los datos de este huésped?

Responde:
• *REGISTRAR* - Para ingresar sus datos
• *OMITIR* - Para saltarlo`;
  } else {
    // Ya se completaron todos los adultos adicionales
    const adults = session.data.adults || 1;
    const childrenUnder4 = session.data.childrenUnder4 || 0;
    const totalGuests = adults + childrenUnder4;
    const adultsRegistered = session.data.currentAdultGuest + 1; // +1 por el huésped principal
    
    await whatsappService.updateSession(phoneNumber, {
      state: STATES.AWAITING_CONFIRMATION,
      data: session.data
    });
    
    return `✅ ¡Todos los huéspedes adultos registrados! (${adultsRegistered} adultos de ${totalGuests} huéspedes totales)

${getConfirmationMessage(session.data)}`;
  }
}

module.exports = {
  STATES,
  processMessage
};
