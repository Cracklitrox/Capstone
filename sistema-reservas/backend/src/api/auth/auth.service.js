const prisma = require('../../db/prisma.client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Autentica a un usuario y devuelve un token JWT si las credenciales son válidas.
 * @param {string} email - El email del usuario.
 * @param {string} password - La contraseña en texto plano del usuario.
 */
const login = async (email, password) => {
  // 1. Buscar al usuario por su email
  const user = await prisma.users.findUnique({
    where: { email },
  });

  // Si no se encuentra el usuario, lanzamos un error
  if (!user) {
    throw new Error('Credenciales inválidas');
  }

  // 2. Comparar la contraseña enviada con la contraseña hasheada en la BD
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  // Si las contraseñas no coinciden, lanzamos un error
  if (!isPasswordValid) {
    throw new Error('Credenciales inválidas');
  }

  // 3. Si todo es correcto, generar el token JWT
  const token = jwt.sign(
    { id: user.id }, // El "payload" - la información que guardamos en el token
    process.env.JWT_SECRET, // La clave secreta para firmar el token
    { expiresIn: process.env.JWT_EXPIRES_IN } // Cuánto tiempo será válido el token
  );

  // Omitimos la contraseña de la respuesta por seguridad
  const { password_hash, ...userWithoutPassword } = user;

  // 4. Devolvemos el usuario y el token
  return { user: userWithoutPassword, token };
};

module.exports = {
  login,
};