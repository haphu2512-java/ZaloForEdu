const { z } = require('zod');

const communityIdParamSchema = z.object({
  id: z.string().trim().min(24).max(24),
});

const createCommunitySchema = z.object({
  name: z.string().trim().min(2).max(100),
  participantIds: z.array(z.string().trim().min(24).max(24)).default([]),
  privacy: z.enum(['public', 'private']).default('private'),
  joinMode: z.enum(['invite', 'approval']).default('invite'),
});

const joinCommunitySchema = z.object({
  inviteCode: z.string().trim().optional(),
});

const approveJoinSchema = z.object({
  userId: z.string().trim().min(24).max(24),
  action: z.enum(['approve', 'reject']).default('approve'),
});

module.exports = {
  communityIdParamSchema,
  createCommunitySchema,
  joinCommunitySchema,
  approveJoinSchema,
};
