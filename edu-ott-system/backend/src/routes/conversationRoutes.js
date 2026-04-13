const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const { protect } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Conversations
 *   description: Quản lý cuộc hội thoại
 */

router.use(protect);

/**
 * @swagger
 * /conversations:
 *   get:
 *     summary: Lấy danh sách cuộc hội thoại
 *     description: Lấy danh sách các cuộc hội thoại (1-1 hoặc nhóm) của người dùng hiện tại
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về danh sách hội thoại
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/', conversationController.getAllConversations);

/**
 * @swagger
 * /conversations:
 *   post:
 *     summary: Tạo mới hoặc lấy hội thoại 1-1
 *     description: Trả về cuộc hội thoại 1-1 giữa user hiện tại và user được chọn, nếu chưa có sẽ tạo mới
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cuộc hội thoại đã có sẵn
 *       201:
 *         description: Đã tạo cuộc hội thoại mới
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post('/', conversationController.getOrCreateConversation);

module.exports = router;
