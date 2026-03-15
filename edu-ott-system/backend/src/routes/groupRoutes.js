const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const groupController = require('../controllers/groupController');
const { protect } = require('../middlewares/auth');
const validate = require('../middlewares/validate');

/**
 * @swagger
 * tags:
 *   name: Groups
 *   description: Quản lý nhóm trong lớp học
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Group:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         avatar:
 *           type: string
 *         class:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             name:
 *               type: string
 *             code:
 *               type: string
 *         members:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               user:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   fullName:
 *                     type: string
 *                   email:
 *                     type: string
 *               role:
 *                 type: string
 *                 enum: [leader, member]
 *               joinedAt:
 *                 type: string
 *                 format: date-time
 *         createdBy:
 *           type: object
 *         maxMembers:
 *           type: number
 *         isActive:
 *           type: boolean
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
 * /groups:
 *   get:
 *     summary: Lấy danh sách nhóm
 *     description: Lấy danh sách nhóm mà user hiện tại tham gia. Admin thấy tất cả.
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: classId
 *         schema:
 *           type: string
 *         description: Lọc theo lớp học
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
 *           default: 10
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
 *                     groups:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Group'
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/', groupController.getAllGroups);

/**
 * @swagger
 * /groups:
 *   post:
 *     summary: Tạo nhóm mới
 *     description: Tạo nhóm mới trong một lớp học. Người tạo tự động trở thành leader.
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - classId
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tên nhóm
 *                 example: Nhóm 1
 *               description:
 *                 type: string
 *                 description: Mô tả nhóm
 *               classId:
 *                 type: string
 *                 description: ID lớp học chứa nhóm
 *               members:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Mảng User ID của thành viên
 *     responses:
 *       201:
 *         description: Tạo nhóm thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Lớp học không tồn tại
 */
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Group name is required'),
    body('classId').notEmpty().withMessage('Class ID is required'),
  ],
  validate,
  groupController.createGroup
);

/**
 * @swagger
 * /groups/{id}:
 *   get:
 *     summary: Chi tiết nhóm
 *     description: Lấy thông tin chi tiết của một nhóm theo ID
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Group ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thành công
 *       404:
 *         description: Không tìm thấy nhóm
 */
router.get('/:id', groupController.getGroup);

/**
 * @swagger
 * /groups/{id}:
 *   put:
 *     summary: Cập nhật nhóm
 *     description: Chỉ người tạo nhóm hoặc Admin mới có quyền cập nhật
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Group ID
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               avatar:
 *                 type: string
 *               maxMembers:
 *                 type: number
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy nhóm
 */
router.put('/:id', groupController.updateGroup);

/**
 * @swagger
 * /groups/{id}:
 *   delete:
 *     summary: Xóa nhóm
 *     description: Chỉ người tạo nhóm hoặc Admin mới có quyền xóa
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Group ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy nhóm
 */
router.delete('/:id', groupController.deleteGroup);

/**
 * @swagger
 * /groups/{id}/members:
 *   post:
 *     summary: Thêm thành viên vào nhóm
 *     description: Thêm một user vào nhóm
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Group ID
 *         schema:
 *           type: string
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
 *                 description: User ID cần thêm
 *     responses:
 *       200:
 *         description: Thêm thành viên thành công
 *       400:
 *         description: User đã là thành viên hoặc nhóm đã đầy
 *       404:
 *         description: Không tìm thấy nhóm
 */
router.post('/:id/members', groupController.addMember);

/**
 * @swagger
 * /groups/{id}/members/{userId}:
 *   delete:
 *     summary: Xóa thành viên khỏi nhóm
 *     description: Chỉ người tạo nhóm hoặc Admin mới có quyền
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Group ID
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         description: User ID cần xóa
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành viên thành công
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy nhóm
 */
router.delete('/:id/members/:userId', groupController.removeMember);

module.exports = router;
