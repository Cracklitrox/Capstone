const express = require('express');
const historyController = require('./reservation_history.controller');

const router = express.Router();

// para la lista
router.get('/', historyController.getHistory);

// para los detalles del modal
router.get('/:id', historyController.getHistoryDetailById);

// para actualizar la observación
router.put('/:id/observation', historyController.updateObservation);

module.exports = router;