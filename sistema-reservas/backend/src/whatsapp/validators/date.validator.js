/**
 * Validador de fechas para el chatbot de WhatsApp
 */

/**
 * Validar formato de fecha (DD/MM/YYYY o DD-MM-YYYY)
 */
function isValidDateFormat(dateString) {
  const regex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  return regex.test(dateString);
}

/**
 * Convertir string a objeto Date
 */
function parseDate(dateString) {
  try {
    const regex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
    const match = dateString.match(regex);
    
    if (!match) return null;
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // Los meses en JS son 0-11
    const year = parseInt(match[3], 10);
    
    const date = new Date(year, month, day);
    
    // Validar que la fecha sea válida
    if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
      return null;
    }
    
    return date;
  } catch (error) {
    return null;
  }
}

/**
 * Validar que la fecha no esté en el pasado
 */
function isNotInPast(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

/**
 * Validar que checkOut sea después de checkIn
 */
function isCheckOutAfterCheckIn(checkIn, checkOut) {
  return checkOut > checkIn;
}

/**
 * Calcular noches entre dos fechas
 */
function calculateNights(checkIn, checkOut) {
  const diffTime = Math.abs(checkOut - checkIn);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Validar fecha de check-in
 */
function validateCheckInDate(dateString) {
  if (!isValidDateFormat(dateString)) {
    return {
      valid: false,
      message: '❌ Formato de fecha inválido.\n\nUsa el formato: DD/MM/AAAA\nEjemplo: 25/12/2025'
    };
  }

  const date = parseDate(dateString);
  if (!date) {
    return {
      valid: false,
      message: '❌ Fecha inválida.\n\nVerifica que el día y mes sean correctos.'
    };
  }

  if (!isNotInPast(date)) {
    return {
      valid: false,
      message: '❌ La fecha de entrada no puede ser en el pasado.\n\nIngresa una fecha de hoy en adelante.'
    };
  }

  // Validar que no sea más de 1 año en el futuro
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  
  if (date > oneYearFromNow) {
    return {
      valid: false,
      message: '❌ No puedes hacer reservas con más de 1 año de anticipación.'
    };
  }

  return {
    valid: true,
    date: date,
    formatted: formatDate(date)
  };
}

/**
 * Validar fecha de check-out
 */
function validateCheckOutDate(dateString, checkInDate) {
  if (!isValidDateFormat(dateString)) {
    return {
      valid: false,
      message: '❌ Formato de fecha inválido.\n\nUsa el formato: DD/MM/AAAA\nEjemplo: 27/12/2025'
    };
  }

  const date = parseDate(dateString);
  if (!date) {
    return {
      valid: false,
      message: '❌ Fecha inválida.\n\nVerifica que el día y mes sean correctos.'
    };
  }

  if (!isCheckOutAfterCheckIn(checkInDate, date)) {
    return {
      valid: false,
      message: '❌ La fecha de salida debe ser después de la fecha de entrada.\n\nIntenta nuevamente.'
    };
  }

  const nights = calculateNights(checkInDate, date);
  
  // Validar estancia mínima (1 noche)
  if (nights < 1) {
    return {
      valid: false,
      message: '❌ La estadía mínima es de 1 noche.'
    };
  }

  // Validar estancia máxima (30 noches)
  if (nights > 30) {
    return {
      valid: false,
      message: '❌ La estadía máxima es de 30 noches.\n\nPara reservas más largas, contacta directamente al hotel.'
    };
  }

  return {
    valid: true,
    date: date,
    formatted: formatDate(date),
    nights: nights
  };
}

/**
 * Formatear fecha a string legible
 */
function formatDate(date) {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formatear fecha para la base de datos (ISO)
 */
function formatDateForDB(date) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

module.exports = {
  isValidDateFormat,
  parseDate,
  isNotInPast,
  isCheckOutAfterCheckIn,
  calculateNights,
  validateCheckInDate,
  validateCheckOutDate,
  formatDate,
  formatDateForDB
};
