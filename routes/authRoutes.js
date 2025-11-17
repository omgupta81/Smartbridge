// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');

// Auth routes
router.post('/register', auth.register);
router.post('/login', auth.login);
router.post('/logout', auth.logout);

// Public: Anyone can call /me
router.get('/me', optionalAuth, auth.me);

module.exports = router;
