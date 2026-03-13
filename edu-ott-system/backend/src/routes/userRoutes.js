const express = require('express');
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middlewares/auth'); // Middleware

const router = express.Router();

// Bảo vệ tất cả routes (Yêu cầu đăng nhập & quyền Admin)
// router.use(protect);
// router.use(restrictTo('admin'));

/**
 * @swagger
 * tags:
 * name: Users
 * description: Quản lý người dùng (Chỉ Admin)
 */

/**
 * @swagger
 * /users:
 * get:
 * summary: Lấy danh sách tất cả users
 * tags: [Users]
 * responses:
 * 200:
 * description: Thành công
 */
router.get('/', userController.getAllUsers);

/**
 * @swagger
 * /users/{id}:
 * get:
 * summary: Lấy thông tin chi tiết user theo ID
 * tags: [Users]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * responses:
 * 200:
 * description: Thành công
 * 404:
 * description: Không tìm thấy user
 */
router.get('/:id', userController.getUser);

/**
 * @swagger
 * /users/{id}:
 * put:
 * summary: Cập nhật thông tin user (Không bao gồm password)
 * tags: [Users]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * fullName:
 * type: string
 * isActive:
 * type: boolean
 * role:
 * type: string
 * responses:
 * 200:
 * description: Cập nhật thành công
 */
router.put('/:id', userController.updateUser);

/**
 * @swagger
 * /users/{id}:
 * delete:
 * summary: Xóa user
 * tags: [Users]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * responses:
 * 204:
 * description: Xóa thành công
 */
router.delete('/:id', userController.deleteUser);

module.exports = router;