// backend/src/api/reservation_history/reservation_history.routes.js

const express = require('express');
const historyController = require('./reservation_history.controller');

const router = express.Router();

// GET /api/v1/reservation_history (para la lista)
router.get('/', historyController.getHistory);

// GET /api/v1/reservation_history/:id (para los detalles del modal)
router.get('/:id', historyController.getHistoryDetailById);

module.exports = router;