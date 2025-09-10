const authService = require('./auth.service');

const loginUser = async (req, res) => {
  try {
    // Extraemos email y password del cuerpo de la petición
    const { email, password } = req.body;

    // Llamamos al servicio de login
    const result = await authService.login(email, password);

    // Si todo va bien, enviamos un 200 OK con el resultado
    res.status(200).json(result);
  } catch (error) {
    // Si el servicio lanza un error (ej. "Credenciales inválidas"), lo capturamos
    console.error('Error de autenticación:', error.message);
    // Enviamos un 401 Unauthorized
    res.status(401).json({ message: error.message });
  }
};


const logoutUser = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader.split(' ')[1];
    const result = await authService.logout(token);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error interno al cerrar sesión.' });
  }
};


const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const userProfile = await authService.getProfile(userId);

    if (!userProfile) {
      return res.status(404).json({ message: 'Perfil de usuario no encontrado.' });
    }

    res.status(200).json(userProfile);
  } catch (error) {
    console.error('Error al obtener el perfil:', error);
    res.status(500).json({ message: 'Error interno al obtener el perfil.' });
  }
};


module.exports = {
  loginUser,
  logoutUser,
  getUserProfile,
};