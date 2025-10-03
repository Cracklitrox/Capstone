const guestsService = require('./guests.service');

/**
 * Buscar huésped por RUT
 */
async function searchGuestByRut(req, res) {
  try {
    const { rut, rutDv } = req.params;

    if (!rut || !rutDv) {
      return res.status(400).json({ 
        message: 'RUT y dígito verificador son requeridos' 
      });
    }

    const result = await guestsService.searchGuestByRut(rut, rutDv);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error al buscar huésped:', error);
    return res.status(500).json({ 
      message: 'Error al buscar huésped',
      error: error.message 
    });
  }
}

/**
 * Crear nuevo huésped
 */
async function createGuest(req, res) {
  try {
    const guestData = req.body;

    // Validaciones básicas
    if (!guestData.firstName || !guestData.paternalLastName || !guestData.email) {
      return res.status(400).json({ 
        message: 'Nombre, apellido paterno y email son requeridos' 
      });
    }

    const guest = await guestsService.createOrUpdateGuest(guestData, false);
    
    return res.status(201).json({ 
      message: 'Huésped creado exitosamente',
      guest: {
        id: guest.id,
        firstName: guest.first_name,
        paternalLastName: guest.paternal_last_name,
        email: guest.email,
      }
    });
  } catch (error) {
    console.error('Error al crear huésped:', error);
    
    if (error.code === 'P2002') {
      return res.status(409).json({ 
        message: 'Ya existe un huésped con ese RUT o email' 
      });
    }
    
    return res.status(500).json({ 
      message: 'Error al crear huésped',
      error: error.message 
    });
  }
}

/**
 * Actualizar huésped existente
 */
async function updateGuest(req, res) {
  try {
    const guestId = parseInt(req.params.id);
    const guestData = req.body;

    if (isNaN(guestId)) {
      return res.status(400).json({ 
        message: 'ID de huésped inválido' 
      });
    }

    const guest = await guestsService.createOrUpdateGuest(guestData, true, guestId);
    
    return res.status(200).json({ 
      message: 'Huésped actualizado exitosamente',
      guest: {
        id: guest.id,
        firstName: guest.first_name,
        paternalLastName: guest.paternal_last_name,
        email: guest.email,
      }
    });
  } catch (error) {
    console.error('Error al actualizar huésped:', error);
    return res.status(500).json({ 
      message: 'Error al actualizar huésped',
      error: error.message 
    });
  }
}

module.exports = {
  searchGuestByRut,
  createGuest,
  updateGuest,
};