const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { verifyToken } = require('../../middleware/auth.middleware');

// POST /api/v1/auth/login
router.post('/login', authController.loginUser);

// GET /api/v1/auth/me (protegida)
router.get('/me', verifyToken, authController.getUserProfile);

// POST /api/v1/auth/logout
router.post('/logout', verifyToken, authController.logoutUser);

module.exports = router;