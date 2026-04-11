const { z } = require('zod');

const createConversationSchema = z.object({
  type: z.enum(['direct', 'group']).default('direct'),
  name: z.string().trim().min(1).max(120).optional(),
  participantIds: z.array(z.string().trim().min(24).max(24)).min(1),
});

const conversationIdParamSchema = z.object({
  id: z.string().trim().min(24).max(24),
});

const memberIdParamSchema = z.object({
  id: z.string().trim().min(24).max(24),
  memberId: z.string().trim().min(24).max(24),
});

const updateGroupNameSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

const addGroupMembersSchema = z.object({
  memberIds: z.array(z.string().trim().min(24).max(24)).min(1),
});

const transferOwnerSchema = z.object({
  newOwnerId: z.string().trim().min(24).max(24),
});

const updateGroupAvatarSchema = z.object({
  avatarUrl: z.string().trim().url(),
});

const updateNicknameSchema = z.object({
  nickname: z.string().trim().min(1).max(60),
});

const pinMessageSchema = z.object({
  messageId: z.string().trim().min(24).max(24),
});

const updateConversationPreferenceSchema = z.object({
  category: z.enum(['primary', 'work', 'family', 'other']).optional(),
  nickname: z.string().trim().min(1).max(60).nullable().optional(),
  isHidden: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
});

const conversationPaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
});

module.exports = {
  createConversationSchema,
  conversationPaginationQuerySchema,
  conversationIdParamSchema,
  memberIdParamSchema,
  updateGroupNameSchema,
  addGroupMembersSchema,
  transferOwnerSchema,
  updateGroupAvatarSchema,
  updateNicknameSchema,
  pinMessageSchema,
  updateConversationPreferenceSchema,
};
