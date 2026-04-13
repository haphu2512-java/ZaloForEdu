const express = require('express');

const notificationController = require('../controllers/notificationController');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { notificationIdParamSchema, notificationPaginationQuerySchema } = require('../validators/notificationSchemas');

const router = express.Router();

router.get('/', auth, validate({ query: notificationPaginationQuerySchema }), notificationController.listNotifications);
router.get('/unread-count', auth, notificationController.getUnreadCount);
router.put('/read-all', auth, notificationController.markAllRead);
router.put('/:id/read', auth, validate({ params: notificationIdParamSchema }), notificationController.markNotificationRead);
router.delete('/:id', auth, validate({ params: notificationIdParamSchema }), notificationController.deleteNotification);

module.exports = router;
