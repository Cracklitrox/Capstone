const prisma = require('../../db/prisma.client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const redisClient = require('../../db/redis.client');

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


const logout = async (token) => {
  // Decodificamos el token para saber su tiempo de expiración
  const decoded = jwt.decode(token);
  // 'exp' es la fecha de expiración en segundos (timestamp)
  const expirationTime = decoded.exp;
  const currentTime = Math.floor(Date.now() / 1000);
  
  // Calculamos cuántos segundos le quedan de vida al token
  const ttl = expirationTime - currentTime;

  // Si el token ya expiró, no hacemos nada
  if (ttl <= 0) {
    return { message: 'El token ya ha expirado.' };
  }

  // Guardamos el token en Redis con el tiempo de vida restante
  // La clave será el propio token, y el valor puede ser cualquier cosa (ej: 'blocked')
  await redisClient.set(token, 'blocked', {
    EX: ttl, // EX significa que el tiempo de expiración está en segundos
  });

  return { message: 'Sesión cerrada exitosamente.' };
};


/**
 * Obtiene el perfil de un usuario por su ID.
 * @param {number} userId - El ID del usuario.
 */
const getProfile = (userId) => {
  return prisma.users.findUnique({
    where: {
      id: userId,
    },
    // Seleccionamos los campos que son seguros de mostrar
    select: {
      id: true,
      email: true,
      first_name: true,
      paternal_last_name: true,
      maternal_last_name: true,
      status: true,
      user_roles: {
        select: {
          roles: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
};


module.exports = {
  login,
  logout,
  getProfile,
};