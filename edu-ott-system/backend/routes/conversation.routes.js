const express = require('express');

const conversationController = require('../controllers/conversationController');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { conversationPaginationQuerySchema, createConversationSchema } = require('../validators/conversationSchemas');

const router = express.Router();

/**
 * @openapi
 * /conversations:
 *   get:
 *     tags: [Conversations]
 *     summary: List current user's conversations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Conversations fetched
 */
router.get('/', auth, validate({ query: conversationPaginationQuerySchema }), conversationController.listConversations);
/**
 * @openapi
 * /conversations:
 *   post:
 *     tags: [Conversations]
 *     summary: Create conversation (direct or group)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConversationInput'
 *     responses:
 *       201:
 *         description: Conversation created
 */
router.post('/', auth, validate({ body: createConversationSchema }), conversationController.createConversation);

module.exports = router;
