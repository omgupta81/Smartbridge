// routes/sessionRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/sessionController');
const { requireAuth, optionalAuth } = require('../middleware/authMiddleware');

// Create session (requires auth)
router.post('/', requireAuth, controller.createSession);

// Get session by roomId (optional auth)
router.get('/:roomId', optionalAuth, controller.getSession);

// Save code (requires auth)
router.put('/:roomId/code', requireAuth, controller.saveSessionCode);

// Endpoint used by landing page to know current user (optional)
router.get('/me', optionalAuth, controller.me);

module.exports = router;
