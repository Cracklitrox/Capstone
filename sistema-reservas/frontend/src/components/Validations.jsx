export const validateProfileForm = (formData) => {
  const errors = {};

  // Validar nombre
  if (!formData.first_name || formData.first_name.trim() === "") {
    errors.first_name = "El nombre es obligatorio.";
  }

  // Validar apellido paterno
  if (!formData.paternal_last_name || formData.paternal_last_name.trim() === "") {
    errors.paternal_last_name = "El apellido paterno es obligatorio.";
  }

  // Validar correo electrónico
  if (!formData.email || formData.email.trim() === "") {
    errors.email = "El correo electrónico es obligatorio.";
  } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
    errors.email = "El formato del correo no es válido.";
  }

  return errors;
};
