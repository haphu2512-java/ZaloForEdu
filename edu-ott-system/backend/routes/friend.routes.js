const express = require('express');

const friendController = require('../controllers/friendController');
const auth = require('../middlewares/auth');
const { createRateLimiter } = require('../middlewares/rateLimiter');
const validate = require('../middlewares/validate');
const {
  friendIdParamSchema,
  friendPaginationQuerySchema,
  requestFriendSchema,
  requestIdParamSchema,
} = require('../validators/friendSchemas');

const router = express.Router();

const friendRequestLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  code: 'FRIEND_REQUEST_RATE_LIMITED',
  message: 'Too many friend requests. Please try again in a minute.',
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
});

/**
 * @openapi
 * /friends/request:
 *   post:
 *     tags: [Friends]
 *     summary: Send friend request
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FriendRequestInput'
 *     responses:
 *       201:
 *         description: Friend request sent
 */
router.post('/request', auth, friendRequestLimiter, validate({ body: requestFriendSchema }), friendController.sendFriendRequest);
/**
 * @openapi
 * /friends/request/{id}/accept:
 *   put:
 *     tags: [Friends]
 *     summary: Accept friend request
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
 *         description: Friend request accepted
 */
router.put(
  '/request/:id/accept',
  auth,
  validate({ params: requestIdParamSchema }),
  friendController.acceptFriendRequest,
);
/**
 * @openapi
 * /friends/request/{id}/reject:
 *   put:
 *     tags: [Friends]
 *     summary: Reject friend request
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
 *         description: Friend request rejected
 */
router.put(
  '/request/:id/reject',
  auth,
  validate({ params: requestIdParamSchema }),
  friendController.rejectFriendRequest,
);
/**
 * @openapi
 * /friends/request/incoming:
 *   get:
 *     tags: [Friends]
 *     summary: Get incoming pending friend requests
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Incoming friend requests fetched
 */
router.get(
  '/request/incoming',
  auth,
  validate({ query: friendPaginationQuerySchema }),
  friendController.getIncomingFriendRequests,
);
/**
 * @openapi
 * /friends/{friendId}:
 *   delete:
 *     tags: [Friends]
 *     summary: Remove a friend
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: friendId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Friend removed
 */
router.delete('/:friendId', auth, validate({ params: friendIdParamSchema }), friendController.removeFriend);
/**
 * @openapi
 * /friends/list:
 *   get:
 *     tags: [Friends]
 *     summary: Get current user's friends
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Friend list fetched
 */
router.get('/list', auth, validate({ query: friendPaginationQuerySchema }), friendController.getFriendList);

module.exports = router;
