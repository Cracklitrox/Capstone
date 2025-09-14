const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

module.exports = authenticate;