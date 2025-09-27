const authService = require('./auth.service');

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'El email es requerido.' });
    }
    if (!password) {
      return res.status(400).json({ message: 'La contraseña es requerida.' });
    }
    
    const result = await authService.login(email, password);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error de autenticación:', error.message);
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

// Actualizar perfil de usuario
const updateProfile = async (req, res) => {
  try {
    // 1. El controlador extrae los datos de la petición (request).
    const userId = req.user.id;
    const profileData = req.body;

    // 2. Llama al servicio para que haga todo el trabajo pesado.
    const updatedProfile = await authService.updateProfile(userId, profileData);
    
    // 3. Si todo va bien, responde al cliente con los datos actualizados.
    res.status(200).json(updatedProfile);

  } catch (error) {
    // 4. Si el servicio lanza un error, el controlador lo atrapa.
    console.error('Error al actualizar el perfil:', error.message);
    
    // Y responde con el código de error adecuado.
    if (error.message.includes('obligatorio') || error.message.includes('inválido') || error.message.includes('en uso')) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Error interno al actualizar el perfil.' });
  }
};

module.exports = {
  loginUser,
  logoutUser,
  getUserProfile,
  updateProfile, 
};