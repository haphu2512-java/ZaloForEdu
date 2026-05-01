const express = require('express');
const auth = require('../middlewares/auth');
const { getCallToken, startCall, endCall, getCallHistory } = require('../controllers/callController');

const router = express.Router();

// All call routes require authentication
router.use(auth);

/**
 * POST /api/v1/calls/token
 * Generate a secure Zego call token (server-side only).
 */
router.post('/token', getCallToken);

/**
 * POST /api/v1/calls/start
 * Create a call session + get token.
 */
router.post('/start', startCall);

/**
 * POST /api/v1/calls/end
 * End a call session.
 */
router.post('/end', endCall);

/**
 * GET /api/v1/calls/history?conversationId=xxx
 * Get call history for a conversation.
 */
router.get('/history', getCallHistory);

module.exports = router;
