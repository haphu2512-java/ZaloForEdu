const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { protect } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Files
 *   description: Upload và quản lý file
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     File:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         originalName:
 *           type: string
 *         filename:
 *           type: string
 *         mimeType:
 *           type: string
 *         size:
 *           type: number
 *         url:
 *           type: string
 *         thumbnail:
 *           type: string
 *         category:
 *           type: string
 *           enum: [document, image, video, audio, other]
 *         uploadedBy:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             fullName:
 *               type: string
 *             email:
 *               type: string
 *         room:
 *           type: string
 *         roomModel:
 *           type: string
 *           enum: [Class, Group, Conversation]
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
 * /files:
 *   get:
 *     summary: Lấy danh sách file
 *     description: Lấy danh sách file đã upload. Có thể lọc theo phòng và loại file.
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: roomId
 *         schema:
 *           type: string
 *         description: Lọc theo phòng
 *       - in: query
 *         name: roomModel
 *         schema:
 *           type: string
 *           enum: [Class, Group, Conversation]
 *         description: Loại phòng
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [document, image, video, audio, other]
 *         description: Lọc theo loại file
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
 *           default: 20
 *         description: Số lượng mỗi trang
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
 *                     files:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/File'
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/', fileController.getFiles);

/**
 * @swagger
 * /files/upload:
 *   post:
 *     summary: Upload file
 *     description: "Upload file lên server. Hỗ trợ: JPEG, PNG, GIF, WebP, MP4, WebM, MP3, WAV, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ZIP, RAR, TXT. Giới hạn 50MB."
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File cần upload
 *               roomId:
 *                 type: string
 *                 description: ID phòng (tùy chọn)
 *               roomModel:
 *                 type: string
 *                 enum: [Class, Group, Conversation]
 *                 description: Loại phòng (tùy chọn)
 *     responses:
 *       201:
 *         description: Upload thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     file:
 *                       $ref: '#/components/schemas/File'
 *       400:
 *         description: Không có file hoặc loại file không được phép
 */
router.post('/upload', fileController.uploadMiddleware, fileController.uploadFile);

/**
 * @swagger
 * /files/{id}:
 *   get:
 *     summary: Lấy thông tin file
 *     description: Lấy thông tin chi tiết của file theo ID
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: File ID
 *         schema:
 *           type: string
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     file:
 *                       $ref: '#/components/schemas/File'
 *       404:
 *         description: Không tìm thấy file
 */
router.get('/:id', fileController.getFile);

/**
 * @swagger
 * /files/{id}:
 *   delete:
 *     summary: Xóa file
 *     description: Soft delete file. Chỉ người upload hoặc Admin mới có quyền xóa.
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: File ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa file thành công
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy file
 */
router.delete('/:id', fileController.deleteFile);

module.exports = router;
