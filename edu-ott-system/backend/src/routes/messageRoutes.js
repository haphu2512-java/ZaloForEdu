const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const messageController = require('../controllers/messageController');
const { protect } = require('../middlewares/auth');
const validate = require('../middlewares/validate');

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Quản lý tin nhắn
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         content:
 *           type: string
 *         type:
 *           type: string
 *           enum: [text, image, video, file, audio, system]
 *         sender:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             fullName:
 *               type: string
 *             avatar:
 *               type: string
 *         room:
 *           type: string
 *         roomModel:
 *           type: string
 *           enum: [Class, Group, Conversation]
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               url:
 *                 type: string
 *               type:
 *                 type: string
 *               size:
 *                 type: number
 *         isEdited:
 *           type: boolean
 *         editedAt:
 *           type: string
 *           format: date-time
 *         isDeleted:
 *           type: boolean
 *         replyTo:
 *           type: string
 *         readBy:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               user:
 *                 type: string
 *               readAt:
 *                 type: string
 *                 format: date-time
 *         reactions:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               user:
 *                 type: string
 *               emoji:
 *                 type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /messages:
 *   get:
 *     summary: Lấy tin nhắn
 *     description: Lấy danh sách tin nhắn theo phòng (Class/Group/Conversation). Hỗ trợ phân trang và infinite scroll.
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của phòng (Class/Group/Conversation)
 *       - in: query
 *         name: roomModel
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Class, Group, Conversation]
 *         description: Loại phòng
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Số tin nhắn mỗi trang
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Lấy tin nhắn trước thời điểm này (cho infinite scroll)
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 results:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 data:
 *                   type: object
 *                   properties:
 *                     messages:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Message'
 *       400:
 *         description: Thiếu roomId hoặc roomModel
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/', messageController.getMessages);

/**
 * @swagger
 * /messages:
 *   post:
 *     summary: Gửi tin nhắn
 *     description: Gửi tin nhắn vào phòng. Hỗ trợ text, image, video, file, audio. Tự động emit socket event.
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomId
 *               - roomModel
 *             properties:
 *               content:
 *                 type: string
 *                 description: Nội dung tin nhắn
 *                 example: Xin chào cả lớp!
 *               type:
 *                 type: string
 *                 enum: [text, image, video, file, audio, system]
 *                 default: text
 *                 description: Loại tin nhắn
 *               roomId:
 *                 type: string
 *                 description: ID phòng
 *               roomModel:
 *                 type: string
 *                 enum: [Class, Group, Conversation]
 *                 description: Loại phòng
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     url:
 *                       type: string
 *                     type:
 *                       type: string
 *                     size:
 *                       type: number
 *               replyTo:
 *                 type: string
 *                 description: ID tin nhắn trả lời
 *     responses:
 *       201:
 *         description: Gửi tin nhắn thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post(
  '/',
  [
    body('roomId').notEmpty().withMessage('Room ID is required'),
    body('roomModel')
      .isIn(['Class', 'Group', 'Conversation'])
      .withMessage('Room model must be Class, Group or Conversation'),
  ],
  validate,
  messageController.sendMessage
);

/**
 * @swagger
 * /messages/{id}:
 *   put:
 *     summary: Sửa tin nhắn
 *     description: Chỉ người gửi mới có quyền sửa tin nhắn của mình
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Message ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Nội dung mới
 *     responses:
 *       200:
 *         description: Sửa tin nhắn thành công
 *       403:
 *         description: Không có quyền sửa
 *       404:
 *         description: Không tìm thấy tin nhắn
 */
router.put(
  '/:id',
  [body('content').notEmpty().withMessage('Content is required')],
  validate,
  messageController.updateMessage
);

/**
 * @swagger
 * /messages/{id}:
 *   delete:
 *     summary: Xóa tin nhắn
 *     description: Soft delete tin nhắn. Chỉ người gửi hoặc Admin mới có quyền xóa.
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Message ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa tin nhắn thành công
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy tin nhắn
 */
router.delete('/:id', messageController.deleteMessage);

/**
 * @swagger
 * /messages/{id}/read:
 *   post:
 *     summary: Đánh dấu đã đọc
 *     description: Đánh dấu tin nhắn đã đọc bởi user hiện tại
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Message ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Đánh dấu thành công
 *       404:
 *         description: Không tìm thấy tin nhắn
 */
router.post('/:id/read', messageController.markAsRead);

/**
 * @swagger
 * /messages/{id}/reaction:
 *   post:
 *     summary: Thêm reaction
 *     description: Thêm hoặc thay đổi reaction emoji cho tin nhắn
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Message ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emoji
 *             properties:
 *               emoji:
 *                 type: string
 *                 description: Emoji reaction
 *                 example: 👍
 *     responses:
 *       200:
 *         description: Thêm reaction thành công
 *       400:
 *         description: Thiếu emoji
 *       404:
 *         description: Không tìm thấy tin nhắn
 */
router.post(
  '/:id/reaction',
  [body('emoji').notEmpty().withMessage('Emoji is required')],
  validate,
  messageController.addReaction
);

module.exports = router;
