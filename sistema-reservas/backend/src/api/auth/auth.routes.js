const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');

// POST /api/v1/auth/login
router.post('/login', authController.loginUser);

module.exports = router;