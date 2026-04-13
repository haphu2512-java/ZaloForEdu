const express = require('express');
const { z } = require('zod');

const pollController = require('../controllers/pollController');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');

/**
 * @openapi
 * tags:
 *   - name: Polls
 *     description: Bình chọn trong nhóm lớp học (Feature 1)
 */

const router = express.Router();

// --- Validation Schemas ---
const createPollSchema = z.object({
  conversationId: z.string().min(1),
  question: z.string().min(1).max(500),
  options: z.array(z.string().min(1).max(200)).min(2).max(10),
  isMultipleChoice: z.boolean().optional(),
  isAnonymous: z.boolean().optional(),
  allowAddOptions: z.boolean().optional(),
  expiredAt: z.string().datetime().optional().nullable(),
});

const voteSchema = z.object({
  optionIndexes: z.array(z.number().int().min(0)).min(1),
});

const listPollsQuerySchema = z.object({
  conversationId: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const pollIdSchema = z.object({ id: z.string().min(1) });

/**
 * @openapi
 * /polls:
 *   post:
 *     tags: [Polls]
 *     summary: Tạo bình chọn mới trong nhóm
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePollInput'
 *     responses:
 *       201:
 *         description: Tạo bình chọn thành công
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.post('/', auth, validate({ body: createPollSchema }), pollController.createPoll);

/**
 * @openapi
 * /polls:
 *   get:
 *     tags: [Polls]
 *     summary: Lấy danh sách bình chọn trong nhóm
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Danh sách polls
 */
router.get('/', auth, validate({ query: listPollsQuerySchema }), pollController.listPolls);

/**
 * @openapi
 * /polls/{id}:
 *   get:
 *     tags: [Polls]
 *     summary: Lấy chi tiết và kết quả bình chọn
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
 *         description: Chi tiết poll
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', auth, validate({ params: pollIdSchema }), pollController.getPoll);

/**
 * @openapi
 * /polls/{id}/vote:
 *   post:
 *     tags: [Polls]
 *     summary: Gửi lựa chọn vote
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VotePollInput'
 *     responses:
 *       200:
 *         description: Vote thành công, trả về poll đã cập nhật
 *       400:
 *         description: Poll đã đóng hoặc đã hết hạn
 */
router.post('/:id/vote', auth, validate({ params: pollIdSchema, body: voteSchema }), pollController.votePoll);

/**
 * @openapi
 * /polls/{id}/close:
 *   put:
 *     tags: [Polls]
 *     summary: Đóng bình chọn (Admin/Creator)
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
 *         description: Poll đã đóng
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.put('/:id/close', auth, validate({ params: pollIdSchema }), pollController.closePoll);

module.exports = router;
