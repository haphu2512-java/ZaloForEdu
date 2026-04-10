const express = require('express');

const searchController = require('../controllers/searchController');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { searchQuerySchema } = require('../validators/searchSchemas');

const router = express.Router();

/**
 * @openapi
 * /search/messages:
 *   get:
 *     tags: [Search]
 *     summary: Search messages in user's conversations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
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
 *         description: Message search result
 */
router.get('/messages', auth, validate({ query: searchQuerySchema }), searchController.searchMessages);
/**
 * @openapi
 * /search/users:
 *   get:
 *     tags: [Search]
 *     summary: Search users by username, email or phone
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
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
 *         description: User search result
 */
router.get('/users', auth, validate({ query: searchQuerySchema }), searchController.searchUsers);

module.exports = router;
