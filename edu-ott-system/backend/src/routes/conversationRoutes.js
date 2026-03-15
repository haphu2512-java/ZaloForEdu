const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.get('/', conversationController.getAllConversations);
router.post('/', conversationController.getOrCreateConversation);

module.exports = router;
