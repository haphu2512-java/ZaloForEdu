const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');

const messageController = {
  getMessages: (req, res) => res.json({ message: 'Get messages' }),
  sendMessage: (req, res) => res.json({ message: 'Send message' }),
  updateMessage: (req, res) => res.json({ message: 'Update message' }),
  deleteMessage: (req, res) => res.json({ message: 'Delete message' }),
  markAsRead: (req, res) => res.json({ message: 'Mark as read' }),
};

router.use(protect);

router.route('/')
  .get(messageController.getMessages)
  .post(messageController.sendMessage);

router.route('/:id')
  .put(messageController.updateMessage)
  .delete(messageController.deleteMessage);

router.post('/:id/read', messageController.markAsRead);

module.exports = router;
