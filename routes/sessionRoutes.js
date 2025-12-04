// routes/sessionRoutes.js
const express = require('express');
const router = express.Router();

const controller = require('../controllers/sessionController');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// Create a new coding session (requires login)
router.post('/', requireAuth, controller.createSession);

// Auth user info (must come BEFORE roomId route!)
router.get('/me', optionalAuth, controller.me);

// Get a session by roomId (guests allowed)
router.get('/:roomId', optionalAuth, controller.getSession);

// Save code (owner or authorized user only)
router.put('/:roomId/code', requireAuth, controller.saveSessionCode);

module.exports = router;
