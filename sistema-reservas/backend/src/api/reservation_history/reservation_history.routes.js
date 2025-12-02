import express from 'express';
import historyController from './reservation_history.controller.js';

const router = express.Router();

// para la lista
router.get('/', historyController.getHistory);

// para los detalles del modal
router.get('/:id', historyController.getHistoryDetailById);

// para actualizar la observación
router.put('/:id/observation', historyController.updateObservation);

export default router;