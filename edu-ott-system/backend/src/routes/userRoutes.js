/**
 * Swagger docs + search route  + teacher routes 
 */
const express = require('express');
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middlewares/auth');

const router = express.Router();

// Tất cả routes yêu cầu đăng nhập
router.use(protect);

/**
 * @swagger
 * /users/search:
 *   get:
 *     summary: Tìm kiếm user theo tên/email
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm (ít nhất 2 ký tự)
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [student, teacher, admin]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/search', userController.searchUsers);

/**
 * @swagger
 * /users/teachers:
 *   get:
 *     summary: Lấy danh sách tất cả giảng viên
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 *       403:
 *         description: Không có quyền (chỉ Admin)
 */
router.get('/teachers', restrictTo('admin'), userController.getAllTeachers);

/**
 * @swagger
 * /users/teacher:
 *   post:
 *     summary: Admin tạo tài khoản giảng viên mới
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
 *               - fullName
 *             properties:
 *               email:
 *                 type: string
 *               fullName:
 *                 type: string
 *               teacherId:
 *                 type: string
 *               department:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo thành công, email mời đã được gửi
 *       400:
 *         description: Email hoặc mã CBGV đã tồn tại
 *       403:
 *         description: Không có quyền (chỉ Admin)
 */
router.post('/teacher', restrictTo('admin'), userController.createTeacher);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Lấy danh sách tất cả users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/', restrictTo('admin'), userController.getAllUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Lấy user theo ID
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
 *         description: Thành công
 *       404:
 *         description: Không tìm thấy user
 */
router.get('/:id', userController.getUser);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Cập nhật user
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
 *               isActive:
 *                 type: boolean
 *               role:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put('/:id', restrictTo('admin'), userController.updateUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Xóa user
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
 */
router.delete('/:id', restrictTo('admin'), userController.deleteUser);

module.exports = router;
