/**
 * Validador de datos de huésped para el chatbot de WhatsApp
 */

/**
 * Validar RUT chileno
 */
function validateRut(rut) {
  // Remover puntos y guiones
  const cleanRut = rut.replace(/\./g, '').replace(/-/g, '');
  
  // Validar formato básico
  const regex = /^(\d{1,8})([0-9Kk])$/;
  const match = cleanRut.match(regex);
  
  if (!match) {
    return {
      valid: false,
      message: '❌ Formato de RUT inválido.\n\nFormato correcto: 11111111-1 o 11.111.111-1'
    };
  }

  const digits = match[1];
  const verifier = match[2].toUpperCase();

  // Calcular dígito verificador
  let sum = 0;
  let multiplier = 2;

  for (let i = digits.length - 1; i >= 0; i--) {
    sum += parseInt(digits[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expectedVerifier = 11 - (sum % 11);
  let calculatedVerifier;

  if (expectedVerifier === 11) {
    calculatedVerifier = '0';
  } else if (expectedVerifier === 10) {
    calculatedVerifier = 'K';
  } else {
    calculatedVerifier = expectedVerifier.toString();
  }

  if (calculatedVerifier !== verifier) {
    return {
      valid: false,
      message: '❌ RUT inválido.\n\nEl dígito verificador no corresponde al número ingresado.\nVerifica que hayas escrito correctamente tu RUT.\n\nEjemplo válido: 11.111.111-1'
    };
  }

  // Formatear RUT
  const formattedRut = formatRut(digits, verifier);

  return {
    valid: true,
    rut: formattedRut
  };
}

/**
 * Formatear RUT con puntos y guión
 */
function formatRut(digits, verifier) {
  const reversed = digits.split('').reverse().join('');
  const withDots = reversed.match(/.{1,3}/g).join('.');
  const formatted = withDots.split('').reverse().join('');
  return `${formatted}-${verifier}`;
}

/**
 * Validar email
 */
function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!regex.test(email)) {
    return {
      valid: false,
      message: '❌ Email inválido.\n\nFormato correcto: usuario@ejemplo.com'
    };
  }

  // Validar longitud
  if (email.length > 100) {
    return {
      valid: false,
      message: '❌ El email es demasiado largo (máximo 100 caracteres).'
    };
  }

  return {
    valid: true,
    email: email.toLowerCase().trim()
  };
}

/**
 * Validar nombre
 */
function validateName(name) {
  const trimmedName = name.trim();
  
  // Validar longitud
  if (trimmedName.length < 2) {
    return {
      valid: false,
      message: '❌ El nombre es demasiado corto (mínimo 2 caracteres).'
    };
  }

  if (trimmedName.length > 100) {
    return {
      valid: false,
      message: '❌ El nombre es demasiado largo (máximo 100 caracteres).'
    };
  }

  // Validar que solo contenga letras y espacios
  const regex = /^[a-záéíóúñüA-ZÁÉÍÓÚÑÜ\s]+$/;
  if (!regex.test(trimmedName)) {
    return {
      valid: false,
      message: '❌ El nombre solo debe contener letras y espacios.'
    };
  }

  // Capitalizar nombre
  const capitalized = trimmedName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return {
    valid: true,
    name: capitalized
  };
}

/**
 * Validar teléfono chileno
 */
function validatePhone(phone) {
  // Remover espacios, guiones y paréntesis
  const cleanPhone = phone.replace(/[\s\-()]/g, '');
  
  // Validar formato chileno: +56912345678 o 912345678
  const regex = /^(\+?56)?([2-9]\d{8})$/;
  const match = cleanPhone.match(regex);
  
  if (!match) {
    return {
      valid: false,
      message: '❌ Número de teléfono inválido.\n\nFormato correcto: +56912345678 o 912345678'
    };
  }

  const formattedPhone = `+56${match[2]}`;

  return {
    valid: true,
    phone: formattedPhone
  };
}

/**
 * Validar cantidad de personas
 */
function validateGuestCount(count, type = 'adults') {
  const num = parseInt(count);

  if (isNaN(num)) {
    return {
      valid: false,
      message: `❌ Ingresa un número válido.`
    };
  }

  if (type === 'adults') {
    if (num < 1) {
      return {
        valid: false,
        message: '❌ Debe haber al menos 1 adulto.'
      };
    }
    if (num > 4) {
      return {
        valid: false,
        message: '❌ Máximo 4 adultos por habitación.\n\nPara más personas, contacta al hotel.'
      };
    }
  } else if (type === 'children') {
    if (num < 0) {
      return {
        valid: false,
        message: '❌ El número de niños no puede ser negativo.'
      };
    }
    if (num > 3) {
      return {
        valid: false,
        message: '❌ Máximo 3 niños por habitación.'
      };
    }
  }

  return {
    valid: true,
    count: num
  };
}

/**
 * Validar solicitudes especiales
 */
function validateSpecialRequests(text) {
  const trimmed = text.trim();
  
  if (trimmed.length === 0) {
    return {
      valid: true,
      requests: ''
    };
  }

  if (trimmed.length > 200) {
    return {
      valid: false,
      message: '❌ Las solicitudes especiales son muy largas (máximo 200 caracteres).'
    };
  }

  return {
    valid: true,
    requests: trimmed
  };
}

export default {
  validateRut,
  validateEmail,
  validateName,
  validatePhone,
  validateGuestCount,
  validateSpecialRequests
};
