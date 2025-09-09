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

module.exports = {
  loginUser,
};