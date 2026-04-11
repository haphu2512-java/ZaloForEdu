const express = require('express');

const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { blockUserBodySchema, updateUserSchema, userIdParamSchema } = require('../validators/userSchemas');

const router = express.Router();

/**
 * @openapi
 * /users/me/blocked:
 *   get:
 *     tags: [Users]
 *     summary: Get current user's blocked users list
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Blocked users fetched
 */
router.get('/me/blocked', auth, userController.getBlockedUsers);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user profile by id
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
 *         description: User fetched
 */
router.get('/:id', auth, validate({ params: userIdParamSchema }), userController.getUserById);
/**
 * @openapi
 * /users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update own user profile
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
 *             $ref: '#/components/schemas/UpdateUserInput'
 *     responses:
 *       200:
 *         description: User updated
 */
router.put('/:id', auth, validate({ params: userIdParamSchema, body: updateUserSchema }), userController.updateUserById);
/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Soft delete own account
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
 *         description: User soft deleted
 */
router.delete('/:id', auth, validate({ params: userIdParamSchema }), userController.deleteUserById);
/**
 * @openapi
 * /users/block/{id}:
 *   post:
 *     tags: [Users]
 *     summary: Block or unblock a user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BlockUserInput'
 *     responses:
 *       200:
 *         description: Block state updated
 */
router.post(
  '/block/:id',
  auth,
  validate({ params: userIdParamSchema, body: blockUserBodySchema }),
  userController.blockOrUnblockUser,
);

module.exports = router;
