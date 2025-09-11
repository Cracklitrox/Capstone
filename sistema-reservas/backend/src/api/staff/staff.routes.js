const express = require('express');
const router = express.Router();
const staffController = require('./staff.controller');

// Las rutas ahora apuntan a las funciones del staffController
router.post('/', staffController.createNewUser);
router.get('/', staffController.listAllUsers);
router.get('/:id', staffController.getUserDetails);
router.put('/:id', staffController.updateUserInfo);

module.exports = router;