/**
 * Validar formato de RUT chileno
 */
export const validateRutFormat = (rut) => {
  const rutPattern = /^[0-9]{7,8}$/;
  return rutPattern.test(rut);
};

/**
 * Validar dígito verificador de RUT
 */
export const validateRutDv = (rut, dv) => {
  if (!validateRutFormat(rut)) return false;

  let suma = 0;
  let multiplicador = 2;

  for (let i = rut.length - 1; i >= 0; i--) {
    suma += parseInt(rut[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const dvEsperado = 11 - (suma % 11);
  let dvCalculado;

  if (dvEsperado === 11) {
    dvCalculado = "0";
  } else if (dvEsperado === 10) {
    dvCalculado = "K";
  } else {
    dvCalculado = dvEsperado.toString();
  }

  return dv.toUpperCase() === dvCalculado;
};

/**
 * Formatear RUT con puntos y guión (XX.XXX.XXX-X)
 */
export const formatRutWithDots = (rut, dv) => {
  if (!rut) return "";

  // Invertir el string para agregar puntos desde atrás
  const reversed = rut.split("").reverse().join("");
  const withDots = reversed.match(/.{1,3}/g)?.join(".") || reversed;
  const formatted = withDots.split("").reverse().join("");

  return `${formatted}-${dv}`;
};

/**
 * Formatear RUT con guión solamente
 */
export const formatRut = (rut, dv) => {
  if (!rut) return "";
  return `${rut}-${dv}`;
};

/**
 * Separar RUT y DV desde un string
 */
export const parseRut = (rutString) => {
  if (!rutString) return { rut: "", dv: "" };

  // Limpiar puntos y espacios
  const cleaned = rutString.replace(/\./g, "").replace(/\s/g, "");
  const parts = cleaned.split("-");

  return {
    rut: parts[0] || "",
    dv: parts[1] || "",
  };
};

/**
 * Limpiar RUT (eliminar puntos, espacios y guiones)
 */
export const cleanRut = (rutString) => {
  if (!rutString) return "";
  return rutString.replace(/[.\s-]/g, "");
};

/**
 * Formatear automáticamente mientras se escribe
 */
export const formatRutInput = (value) => {
  // Eliminar caracteres no permitidos
  const cleaned = value.replace(/[^0-9kK]/g, "");

  if (cleaned.length === 0) return "";

  // Separar número y dv
  const numPart = cleaned.slice(0, -1);
  const dvPart = cleaned.slice(-1).toUpperCase();

  if (numPart.length === 0) return dvPart;

  // Formatear con puntos
  const reversed = numPart.split("").reverse().join("");
  const withDots = reversed.match(/.{1,3}/g)?.join(".") || reversed;
  const formatted = withDots.split("").reverse().join("");

  return `${formatted}-${dvPart}`;
};

/**
 * Validar pasaporte (8-15 caracteres alfanuméricos)
 */
export const validatePassport = (passport) => {
  if (!passport) return false;
  const passportPattern = /^[A-Z0-9]{8,15}$/;
  return passportPattern.test(passport.toUpperCase());
};

/**
 * Calcular DV a partir de RUT
 */
export const calculateDv = (rut) => {
  if (!validateRutFormat(rut)) return "";

  let suma = 0;
  let multiplicador = 2;

  for (let i = rut.length - 1; i >= 0; i--) {
    suma += parseInt(rut[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const dvEsperado = 11 - (suma % 11);

  if (dvEsperado === 11) return "0";
  if (dvEsperado === 10) return "K";
  return dvEsperado.toString();
};
