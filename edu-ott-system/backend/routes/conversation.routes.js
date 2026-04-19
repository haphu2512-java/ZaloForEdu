const express = require('express');

const conversationController = require('../controllers/conversationController');
const groupFeatureController = require('../controllers/groupFeatureController');
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
const { z } = require('zod');

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
 * /conversations/archived:
 *   get:
 *     tags: [Conversations]
 *     summary: List archived (hidden) conversations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Archived conversations fetched
 */
router.get('/archived', auth, conversationController.listArchivedConversations);

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
/**
 * @openapi
 * /conversations/{id}/disband:
 *   delete:
 *     tags: [Conversations]
 *     summary: Disband group (owner only)
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
 *         description: Group disbanded successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Forbidden
 */
router.delete(
  '/:id/disband',
  auth,
  validate({ params: conversationIdParamSchema }),
  conversationController.disbandGroup,
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

// ==================== FEATURE 2: PINNED MESSAGES (Bảng tin) ====================
const pinBodySchema = z.object({ messageId: z.string().min(1) });
const pinParamSchema = z.object({ id: z.string().min(1), messageId: z.string().min(1) });

// POST /:id/pins - Ghím tin nhắn
router.post(
  '/:id/pins',
  auth,
  validate({ params: conversationIdParamSchema, body: pinBodySchema }),
  groupFeatureController.pinMessage,
);
// DELETE /:id/pins/:messageId - Bỏ ghím
router.delete(
  '/:id/pins/:messageId',
  auth,
  validate({ params: pinParamSchema }),
  groupFeatureController.unpinMessage,
);
// GET /:id/pins - Lấy danh sách ghím (Bảng tin)
router.get(
  '/:id/pins',
  auth,
  validate({ params: conversationIdParamSchema }),
  groupFeatureController.getPinnedMessages,
);

// ==================== FEATURE 4: JOIN APPROVAL ====================
const groupSettingsSchema = z.object({
  isApprovalRequired: z.boolean().optional(),
  canMembersUpdateInfo: z.boolean().optional(),
  canMembersPin: z.boolean().optional(),
  canMembersCreateReminders: z.boolean().optional(),
  canMembersCreatePolls: z.boolean().optional(),
  canMembersSendMessages: z.boolean().optional(),
});
const joinRequestBodySchema = z.object({
  reason: z.string().max(300).optional(),
});
const processRequestBodySchema = z.object({
  action: z.enum(['approve', 'reject']),
});
const joinRequestParamSchema = z.object({ id: z.string().min(1), requestId: z.string().min(1) });

// PUT /:id/settings - Cập nhật cài đặt nhóm
router.put(
  '/:id/settings',
  auth,
  validate({ params: conversationIdParamSchema, body: groupSettingsSchema }),
  groupFeatureController.updateGroupSettings,
);
// POST /:id/join-requests - Gửi yêu cầu tham gia nhóm
router.post(
  '/:id/join-requests',
  auth,
  validate({ params: conversationIdParamSchema, body: joinRequestBodySchema }),
  groupFeatureController.requestToJoin,
);
// GET /:id/join-requests - Admin lấy danh sách chờ duyệt
router.get(
  '/:id/join-requests',
  auth,
  validate({ params: conversationIdParamSchema }),
  groupFeatureController.listJoinRequests,
);
// PUT /:id/join-requests/:requestId - Duyệt / Từ chối
router.put(
  '/:id/join-requests/:requestId',
  auth,
  validate({ params: joinRequestParamSchema, body: processRequestBodySchema }),
  groupFeatureController.processJoinRequest,
);

// ==================== FEATURE 5: INVITE LINKS ====================
const inviteCodeParamSchema = z.object({ code: z.string().min(1) });

// GET /:id/invite-link - Lấy/tạo invite link
router.get(
  '/:id/invite-link',
  auth,
  validate({ params: conversationIdParamSchema }),
  groupFeatureController.getInviteLink,
);
// POST /preview/:code - Xem preview nhóm (public, không cần auth)
router.get(
  '/preview/:code',
  auth,
  validate({ params: inviteCodeParamSchema }),
  groupFeatureController.previewGroupByInviteCode,
);
// POST /join/:code - Tham gia nhóm qua invite link
router.post(
  '/join/:code',
  auth,
  validate({ params: inviteCodeParamSchema }),
  groupFeatureController.joinByInviteLink,
);
// POST /invite/:code/reset - Reset invite link
router.post(
  '/invite/:code/reset',
  auth,
  validate({ params: inviteCodeParamSchema }),
  groupFeatureController.resetInviteLink,
);

module.exports = router;
