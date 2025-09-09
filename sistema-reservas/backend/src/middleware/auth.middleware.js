const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // 1. Buscamos el token en los headers de la petición
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // 2. Si no hay token, enviamos un error 403 (Forbidden)
  if (!token) {
    return res.status(403).json({ message: 'Acceso denegado' });
  }

  // 3. Verificamos que el token sea válido
  try {
    // jwt.verify() decodifica el token. Si es inválido (expirado, malformado), lanzará un error.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Guardamos el payload decodificado (que tiene el id del usuario) en el objeto 'req'
    // para que los siguientes middlewares o controladores puedan usarlo.
    req.user = decoded;

    // Si todo está bien, llamamos a next() para que la petición continúe
    next();
  } catch (error) {
    console.error('Error al verificar el token:', error.message);
    // Si el token no es válido, enviamos un error 401 (Unauthorized)
    return res.status(401).json({ message: 'Token inválido o expirado.' });
  }
};

module.exports = {
  verifyToken,
};