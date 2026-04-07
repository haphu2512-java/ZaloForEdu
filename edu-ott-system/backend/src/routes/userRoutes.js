const express = require('express');
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Quản lý người dùng
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /users/search:
 *   get:
 *     summary: Tìm kiếm người dùng
 *     description: Tìm kiếm người dùng theo tên hoặc email
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm
 *     responses:
 *       200:
 *         description: Trả về danh sách người dùng
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/search', userController.searchUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Lấy thông tin user
 *     description: Lấy chi tiết thông tin của một user qua ID
 *     tags: [Users]
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
 *         description: Trả về thông tin user
 *       404:
 *         description: Không tìm thấy user
 */
router.get('/:id', userController.getUser);

// Admin-only routes
router.use(restrictTo('admin'));

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Lấy danh sách tất cả user (Admin)
 *     description: Chỉ Admin mới có quyền lấy danh sách này
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 *       403:
 *         description: Không có quyền admin
 */
router.get('/', userController.getAllUsers);

/**
 * @swagger
 * /users/teacher:
 *   post:
 *     summary: Tạo tài khoản giáo viên (Admin)
 *     description: Admin cấp tài khoản cho giáo viên mới
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - fullName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               fullName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo thành công
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc email đã tồn tại
 */
router.post('/teacher', userController.createTeacher);

/**
 * @swagger
 * /users/teachers:
 *   get:
 *     summary: Lấy danh sách giáo viên (Admin)
 *     description: Lấy danh sách tất cả giáo viên trong hệ thống
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/teachers', userController.getAllTeachers);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Cập nhật thông tin user (Admin)
 *     description: Cập nhật thông tin của user bởi Admin
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               status:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [student, teacher, admin]
 *     responses:
 *       200:
 *         description: Thành công
 *       404:
 *         description: Không tìm thấy user
 */
router.put('/:id', userController.updateUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Xóa user (Admin)
 *     description: Xóa hoàn toàn một user trong hệ thống
 *     tags: [Users]
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
 *         description: Xóa thành công
 *       404:
 *         description: Không tìm thấy user
 */
router.delete('/:id', userController.deleteUser);

module.exports = router;
