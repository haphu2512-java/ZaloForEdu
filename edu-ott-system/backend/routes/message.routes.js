const express = require('express');

const messageController = require('../controllers/messageController');
const auth = require('../middlewares/auth');
const { createRateLimiter } = require('../middlewares/rateLimiter');
const validate = require('../middlewares/validate');
const {
  conversationParamSchema,
  messageIdParamSchema,
  messagePaginationQuerySchema,
  sendMessageSchema,
  reactMessageSchema,
} = require('../validators/messageSchemas');

const router = express.Router();

const messageLimiter = createRateLimiter({
  windowMs: 15 * 1000,
  max: 25,
  code: 'MESSAGE_RATE_LIMITED',
  message: 'You are sending messages too fast. Please slow down.',
});

/**
 * @openapi
 * /messages/send:
 *   post:
 *     tags: [Messages]
 *     summary: Send a message to conversation
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendMessageInput'
 *     responses:
 *       201:
 *         description: Message sent
 */
router.post('/send', auth, messageLimiter, validate({ body: sendMessageSchema }), messageController.sendMessage);
/**
 * @openapi
 * /messages/conversation/{id}:
 *   get:
 *     tags: [Messages]
 *     summary: List messages in a conversation with cursor pagination
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: cursor
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Messages fetched
 */
router.get(
  '/conversation/:id',
  auth,
  validate({ params: conversationParamSchema, query: messagePaginationQuerySchema }),
  messageController.listMessagesByConversation,
);
/**
 * @openapi
 * /messages/{id}/read:
 *   put:
 *     tags: [Messages]
 *     summary: Mark message as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message marked as read
 */
router.put('/:id/read', auth, validate({ params: messageIdParamSchema }), messageController.markMessageRead);
/**
 * @openapi
 * /messages/{id}:
 *   delete:
 *     tags: [Messages]
 *     summary: Delete message by sender
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message deleted
 */
router.delete('/:id', auth, validate({ params: messageIdParamSchema }), messageController.deleteMessage);

// New features
router.put('/:id/recall', auth, validate({ params: messageIdParamSchema }), messageController.recallMessage);
router.put('/:id/react', auth, validate({ params: messageIdParamSchema, body: reactMessageSchema }), messageController.reactToMessage);

module.exports = router;
