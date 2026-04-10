const express = require('express');

const conversationController = require('../controllers/conversationController');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const {
  conversationPaginationQuerySchema,
  createConversationSchema,
  conversationIdParamSchema,
  memberIdParamSchema,
  updateGroupNameSchema,
  addGroupMembersSchema,
  transferOwnerSchema,
  updateGroupAvatarSchema,
  updateNicknameSchema,
  pinMessageSchema,
  updateConversationPreferenceSchema,
} = require('../validators/conversationSchemas');

const router = express.Router();

/**
 * @openapi
 * /conversations:
 *   get:
 *     tags: [Conversations]
 *     summary: List current user's conversations
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
 *         description: Conversations fetched
 */
router.get('/', auth, validate({ query: conversationPaginationQuerySchema }), conversationController.listConversations);
/**
 * @openapi
 * /conversations:
 *   post:
 *     tags: [Conversations]
 *     summary: Create conversation (direct or group)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConversationInput'
 *     responses:
 *       201:
 *         description: Conversation created
 */
router.post('/', auth, validate({ body: createConversationSchema }), conversationController.createConversation);
/**
 * @openapi
 * /conversations/{id}/name:
 *   put:
 *     tags: [Conversations]
 *     summary: Update group name (owner/admin)
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
 *             $ref: '#/components/schemas/UpdateGroupNameInput'
 *     responses:
 *       200:
 *         description: Group name updated
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.put(
  '/:id/name',
  auth,
  validate({ params: conversationIdParamSchema, body: updateGroupNameSchema }),
  conversationController.updateGroupName,
);
/**
 * @openapi
 * /conversations/{id}/members:
 *   post:
 *     tags: [Conversations]
 *     summary: Add members to group (owner/admin)
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
 *             $ref: '#/components/schemas/AddGroupMembersInput'
 *     responses:
 *       200:
 *         description: Members added to group
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  '/:id/members',
  auth,
  validate({ params: conversationIdParamSchema, body: addGroupMembersSchema }),
  conversationController.addGroupMembers,
);
/**
 * @openapi
 * /conversations/{id}/members/{memberId}:
 *   delete:
 *     tags: [Conversations]
 *     summary: Remove member from group (owner/admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed from group
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.delete(
  '/:id/members/:memberId',
  auth,
  validate({ params: memberIdParamSchema }),
  conversationController.removeGroupMember,
);
/**
 * @openapi
 * /conversations/{id}/admins/{memberId}/promote:
 *   put:
 *     tags: [Conversations]
 *     summary: Promote member to group admin (owner only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member promoted to admin
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.put(
  '/:id/admins/:memberId/promote',
  auth,
  validate({ params: memberIdParamSchema }),
  conversationController.promoteGroupAdmin,
);
/**
 * @openapi
 * /conversations/{id}/admins/{memberId}/demote:
 *   put:
 *     tags: [Conversations]
 *     summary: Demote group admin to member (owner only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Admin role removed
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.put(
  '/:id/admins/:memberId/demote',
  auth,
  validate({ params: memberIdParamSchema }),
  conversationController.demoteGroupAdmin,
);
/**
 * @openapi
 * /conversations/{id}/owner:
 *   put:
 *     tags: [Conversations]
 *     summary: Transfer group ownership (owner only)
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
 *             $ref: '#/components/schemas/TransferGroupOwnerInput'
 *     responses:
 *       200:
 *         description: Group ownership transferred
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.put(
  '/:id/owner',
  auth,
  validate({ params: conversationIdParamSchema, body: transferOwnerSchema }),
  conversationController.transferGroupOwner,
);
/**
 * @openapi
 * /conversations/{id}/leave:
 *   post:
 *     tags: [Conversations]
 *     summary: Leave current group
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
 *         description: Left group successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post(
  '/:id/leave',
  auth,
  validate({ params: conversationIdParamSchema }),
  conversationController.leaveGroup,
);
router.put(
  '/:id/avatar',
  auth,
  validate({ params: conversationIdParamSchema, body: updateGroupAvatarSchema }),
  conversationController.updateGroupAvatar,
);
router.put(
  '/:id/nicknames/:memberId',
  auth,
  validate({ params: memberIdParamSchema, body: updateNicknameSchema }),
  conversationController.updateGroupNickname,
);
router.put(
  '/:id/pin',
  auth,
  validate({ params: conversationIdParamSchema, body: pinMessageSchema }),
  conversationController.pinGroupMessage,
);
router.delete(
  '/:id/pin',
  auth,
  validate({ params: conversationIdParamSchema }),
  conversationController.unpinGroupMessage,
);
router.put(
  '/:id/preferences',
  auth,
  validate({ params: conversationIdParamSchema, body: updateConversationPreferenceSchema }),
  conversationController.updateConversationPreference,
);

module.exports = router;
