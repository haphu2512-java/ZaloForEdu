const express = require('express');

const chatbotController = require('../controllers/chatbotController');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { askChatbotSchema } = require('../validators/chatbotSchemas');

const router = express.Router();

/**
 * @openapi
 * /chatbot/ask:
 *   post:
 *     tags: [ChatBot]
 *     summary: Ask AI chatbot and get a response
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AskChatbotInput'
 *     responses:
 *       200:
 *         description: Chatbot answered
 *       400:
 *         description: Invalid payload
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/ask', auth, validate({ body: askChatbotSchema }), chatbotController.askChatbot);

module.exports = router;
