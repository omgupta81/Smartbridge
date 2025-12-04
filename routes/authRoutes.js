// routes/authRoutes.js
const express = require('express');
const router = express.Router();

const auth = require('../controllers/authController');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// Auth routes
router.post('/register', auth.register);
router.post('/login', auth.login);
router.post('/logout', auth.logout);

// Public endpoint: returns logged-in user OR null
router.get('/me', optionalAuth, auth.me);

module.exports = router;
