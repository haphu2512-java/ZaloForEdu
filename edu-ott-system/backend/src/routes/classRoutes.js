const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const classController = require('../controllers/classController');
const { protect, restrictTo } = require('../middlewares/auth');
const validate = require('../middlewares/validate');

/**
 * @swagger
 * tags:
 *   name: Classes
 *   description: Quản lý lớp học
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Class:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         code:
 *           type: string
 *         description:
 *           type: string
 *         coverImage:
 *           type: string
 *         subject:
 *           type: string
 *         semester:
 *           type: string
 *         academicYear:
 *           type: string
 *         teacher:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             fullName:
 *               type: string
 *             email:
 *               type: string
 *         students:
 *           type: array
 *           items:
 *             type: string
 *         maxStudents:
 *           type: number
 *         status:
 *           type: string
 *           enum: [active, completed, archived]
 *         settings:
 *           type: object
 *           properties:
 *             allowStudentPost:
 *               type: boolean
 *             allowFileUpload:
 *               type: boolean
 *             requireApproval:
 *               type: boolean
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
 * /classes:
 *   get:
 *     summary: Lấy danh sách lớp học
 *     description: Lấy danh sách lớp học của user hiện tại. Admin thấy tất cả, Teacher thấy lớp mình dạy, Student thấy lớp đã tham gia.
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, completed, archived]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *         description: Lọc theo môn học
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên hoặc mã lớp
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
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 data:
 *                   type: object
 *                   properties:
 *                     classes:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Class'
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/', classController.getAllClasses);

/**
 * @swagger
 * /classes:
 *   post:
 *     summary: Tạo lớp học mới
 *     description: Chỉ Teacher hoặc Admin mới có quyền tạo lớp học
 *     tags: [Classes]
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
 *               - code
 *               - subject
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tên lớp học
 *                 example: Lập trình Web
 *               code:
 *                 type: string
 *                 description: Mã lớp (tự động uppercase)
 *                 example: WEB101
 *               description:
 *                 type: string
 *                 description: Mô tả lớp học
 *               subject:
 *                 type: string
 *                 description: Môn học
 *                 example: Công nghệ phần mềm
 *               semester:
 *                 type: string
 *                 example: HK1
 *               academicYear:
 *                 type: string
 *                 example: 2025-2026
 *               maxStudents:
 *                 type: number
 *                 example: 50
 *               coverImage:
 *                 type: string
 *               settings:
 *                 type: object
 *                 properties:
 *                   allowStudentPost:
 *                     type: boolean
 *                   allowFileUpload:
 *                     type: boolean
 *                   requireApproval:
 *                     type: boolean
 *     responses:
 *       201:
 *         description: Tạo lớp thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       403:
 *         description: Không có quyền
 */
router.post(
  '/',
  restrictTo('teacher', 'admin'),
  [
    body('name').trim().notEmpty().withMessage('Class name is required'),
    body('code').trim().notEmpty().withMessage('Class code is required'),
    body('subject').trim().notEmpty().withMessage('Subject is required'),
  ],
  validate,
  classController.createClass
);

router.post(
  '/join-by-code',
  restrictTo('student'),
  [
    body('code').trim().notEmpty().withMessage('Class code is required'),
  ],
  validate,
  classController.joinClassByCode
);

/**
 * @swagger
 * /classes/{id}:
 *   get:
 *     summary: Chi tiết lớp học
 *     description: Lấy thông tin chi tiết của một lớp học theo ID
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Class ID
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
 *                     class:
 *                       $ref: '#/components/schemas/Class'
 *       404:
 *         description: Không tìm thấy lớp học
 */
router.get('/:id', classController.getClass);

/**
 * @swagger
 * /classes/{id}:
 *   put:
 *     summary: Cập nhật lớp học
 *     description: Chỉ Teacher của lớp hoặc Admin mới có quyền cập nhật
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Class ID
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
 *               subject:
 *                 type: string
 *               semester:
 *                 type: string
 *               academicYear:
 *                 type: string
 *               coverImage:
 *                 type: string
 *               maxStudents:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [active, completed, archived]
 *               settings:
 *                 type: object
 *                 properties:
 *                   allowStudentPost:
 *                     type: boolean
 *                   allowFileUpload:
 *                     type: boolean
 *                   requireApproval:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy lớp học
 */
router.put('/:id', restrictTo('teacher', 'admin'), classController.updateClass);

/**
 * @swagger
 * /classes/{id}:
 *   delete:
 *     summary: Xóa lớp học
 *     description: Chỉ Teacher của lớp hoặc Admin mới có quyền xóa
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Class ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Không tìm thấy lớp học
 */
router.delete('/:id', restrictTo('teacher', 'admin'), classController.deleteClass);

/**
 * @swagger
 * /classes/{id}/join:
 *   post:
 *     summary: Tham gia lớp học
 *     description: Student tham gia vào lớp học
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Class ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tham gia thành công
 *       400:
 *         description: Đã tham gia hoặc lớp đã đầy
 *       404:
 *         description: Không tìm thấy lớp học
 */
router.post('/:id/join', restrictTo('student'), classController.joinClass);

/**
 * @swagger
 * /classes/{id}/leave:
 *   post:
 *     summary: Rời lớp học
 *     description: Student rời khỏi lớp học
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Class ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rời lớp thành công
 *       400:
 *         description: Chưa tham gia lớp học này
 *       404:
 *         description: Không tìm thấy lớp học
 */
router.post('/:id/leave', restrictTo('student'), classController.leaveClass);

/**
 * @swagger
 * /classes/{id}/members:
 *   get:
 *     summary: Lấy danh sách thành viên lớp
 *     description: Lấy danh sách giáo viên và sinh viên trong lớp
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Class ID
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
 *                     teacher:
 *                       type: object
 *                     students:
 *                       type: array
 *                       items:
 *                         type: object
 *                     totalMembers:
 *                       type: integer
 *       404:
 *         description: Không tìm thấy lớp học
 */
router.get('/:id/members', classController.getClassMembers);

// Add student to class (teacher/admin only)
router.post('/:id/add-student', restrictTo('teacher', 'admin'), classController.addStudent);

module.exports = router;
