const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect, restrictTo } = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Thống kê và phân tích dữ liệu
 */

// All routes require authentication
router.use(protect);

/**
 * @swagger
 * /analytics/dashboard:
 *   get:
 *     summary: Thống kê tổng quan (Dashboard)
 *     description: |
 *       Trả về thống kê tổng quan tùy theo role của user:
 *       - **Admin**: Tổng số users, classes, groups, messages, files. Phân bổ theo role và trạng thái. Hoạt động tin nhắn 7 ngày gần đây.
 *       - **Teacher**: Số lớp dạy, tổng sinh viên, nhóm, tin nhắn đã gửi.
 *       - **Student**: Số lớp tham gia, nhóm, tin nhắn đã gửi.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
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
 *                   example: success
 *                 data:
 *                   type: object
 *                   description: Dữ liệu thống kê tùy theo role
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                       description: (Admin) Tổng số users active
 *                     totalClasses:
 *                       type: integer
 *                       description: (Admin) Tổng số lớp
 *                     totalGroups:
 *                       type: integer
 *                       description: (Admin) Tổng số nhóm
 *                     totalMessages:
 *                       type: integer
 *                       description: (Admin) Tổng tin nhắn
 *                     totalFiles:
 *                       type: integer
 *                       description: (Admin) Tổng file
 *                     usersByRole:
 *                       type: array
 *                       description: (Admin) Phân bổ users theo role
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     classesByStatus:
 *                       type: array
 *                       description: (Admin) Phân bổ lớp theo trạng thái
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     messageActivity:
 *                       type: array
 *                       description: (Admin) Hoạt động tin nhắn 7 ngày
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             description: Ngày (YYYY-MM-DD)
 *                           count:
 *                             type: integer
 *                     myClasses:
 *                       type: integer
 *                       description: (Teacher/Student) Số lớp
 *                     myGroups:
 *                       type: integer
 *                       description: (Student) Số nhóm
 *                     myMessages:
 *                       type: integer
 *                       description: (Student) Tổng tin nhắn đã gửi
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/dashboard', analyticsController.getDashboard);

/**
 * @swagger
 * /analytics/classes/{id}:
 *   get:
 *     summary: Thống kê lớp học
 *     description: |
 *       Thống kê chi tiết cho một lớp học bao gồm:
 *       - Tổng số sinh viên, tin nhắn, file, nhóm
 *       - Phân bổ tin nhắn theo loại (text, image, video, file)
 *       - Top 10 thành viên tích cực nhất
 *       - Hoạt động tin nhắn 30 ngày gần đây
 *     tags: [Analytics]
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
 *                     className:
 *                       type: string
 *                     classCode:
 *                       type: string
 *                     totalStudents:
 *                       type: integer
 *                     totalMessages:
 *                       type: integer
 *                     totalFiles:
 *                       type: integer
 *                     totalGroups:
 *                       type: integer
 *                     messagesByType:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     activeMembers:
 *                       type: array
 *                       description: Top 10 thành viên tích cực
 *                       items:
 *                         type: object
 *                         properties:
 *                           user:
 *                             type: object
 *                             properties:
 *                               fullName:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                           messageCount:
 *                             type: integer
 *                     dailyActivity:
 *                       type: array
 *                       description: Hoạt động 30 ngày
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           count:
 *                             type: integer
 *       404:
 *         description: Không tìm thấy lớp học
 */
router.get('/classes/:id', analyticsController.getClassAnalytics);

/**
 * @swagger
 * /analytics/users/{id}:
 *   get:
 *     summary: Thống kê người dùng
 *     description: |
 *       Thống kê chi tiết cho một người dùng (Chỉ Admin hoặc Teacher):
 *       - Thông tin cơ bản
 *       - Số lớp, nhóm, tin nhắn, file
 *       - Phân bổ tin nhắn theo loại
 *       - Hoạt động 30 ngày gần đây
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: User ID
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
 *                     user:
 *                       type: object
 *                       properties:
 *                         fullName:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                         avatar:
 *                           type: string
 *                         lastLogin:
 *                           type: string
 *                           format: date-time
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                     classCount:
 *                       type: integer
 *                     groupCount:
 *                       type: integer
 *                     messageCount:
 *                       type: integer
 *                     fileCount:
 *                       type: integer
 *                     messagesByType:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     dailyActivity:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           count:
 *                             type: integer
 *       403:
 *         description: Không có quyền (chỉ Admin/Teacher)
 *       404:
 *         description: Không tìm thấy user
 */
router.get('/users/:id', restrictTo('admin', 'teacher'), analyticsController.getUserAnalytics);

module.exports = router;
