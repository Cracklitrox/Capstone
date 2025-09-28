const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. FUNCIÓN AUTHENTICATE (sin cambios)
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Acceso denegado. No se proporcionó un token.' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.users.findUnique({
      where: { id: decoded.id },
      include: {
        user_roles: {
          select: {
            roles: {
              select: { name: true },
            },
          },
        },
      },
    });
    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado.' });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error('Error al verificar el token:', error.message);
    return res.status(401).json({ message: 'Token inválido o expirado.' });
  }
};

// 2. AÑADE LA FUNCIÓN AUTHORIZE AQUÍ
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado.' });
    }
    const userRoles = req.user.user_roles.map(roleInfo => roleInfo.roles.name);
    const hasPermission = userRoles.some(role => allowedRoles.includes(role));
    if (!hasPermission) {
      return res.status(403).json({ message: 'Acceso prohibido. No tienes los permisos necesarios.' });
    }
    next();
  };
};

// 3. CAMBIA LA ÚLTIMA LÍNEA PARA EXPORTAR UN OBJETO
module.exports = {
  authenticate,
  authorize,
};