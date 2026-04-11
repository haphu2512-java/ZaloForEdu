const express = require('express');

const notificationController = require('../controllers/notificationController');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { notificationIdParamSchema, notificationPaginationQuerySchema } = require('../validators/notificationSchemas');

const router = express.Router();

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List notifications of current user
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
 *         description: Notifications fetched
 */
router.get('/', auth, validate({ query: notificationPaginationQuerySchema }), notificationController.listNotifications);
/**
 * @openapi
 * /notifications/{id}/read:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark notification as read
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
 *         description: Notification marked as read
 */
router.put('/:id/read', auth, validate({ params: notificationIdParamSchema }), notificationController.markNotificationRead);

module.exports = router;
