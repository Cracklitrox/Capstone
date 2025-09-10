const staffService  = require('./staff.service.js');


const createNewUser = async (req, res) => {
  try {
    const userData = req.body;
    const newUser = await staffService .createUser(userData);
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error al crear el usuario:', error);
    res.status(500).json({ message: 'Error interno al crear el usuario.' });
  }
};


const listAllUsers = async (req, res) => {
  try {
    const users = await staffService .getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    console.error('Error al listar los usuarios:', error);
    res.status(500).json({ message: 'Error interno al obtener los usuarios.' });
  }
};


const getUserDetails = async (req, res) => {
  try {
    // El id viene como string en la URL, lo convertimos a número
    const userId = parseInt(req.params.id, 10);

    // Verificamos si el id es un número válido
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'El ID debe ser un número válido.' });
    }

    const user = await staffService .getUserById(userId);

    // Si el servicio no encuentra el usuario, devolvemos un 404
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error al obtener detalles del usuario:', error);
    res.status(500).json({ message: 'Error interno al obtener el usuario.' });
  }
};


const updateUserInfo = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const userData = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({ message: 'El ID debe ser un número válido.' });
    }

    const updatedUser = await staffService .updateUser(userId, userData);
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error al actualizar el usuario:', error);
    res.status(500).json({ message: 'Error interno al actualizar el usuario.' });
  }
};


module.exports = {
  createNewUser,
  listAllUsers,
  getUserDetails,
  updateUserInfo,
};