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
    dvCalculado = '0';
  } else if (dvEsperado === 10) {
    dvCalculado = 'K';
  } else {
    dvCalculado = dvEsperado.toString();
  }

  return dv.toUpperCase() === dvCalculado;
};

/**
 * Formatear RUT con guión
 */
export const formatRut = (rut, dv) => {
  if (!rut) return '';
  return `${rut}-${dv}`;
};

/**
 * Separar RUT y DV desde un string
 */
export const parseRut = (rutString) => {
  if (!rutString) return { rut: '', dv: '' };
  
  const parts = rutString.split('-');
  return {
    rut: parts[0] || '',
    dv: parts[1] || '',
  };
};