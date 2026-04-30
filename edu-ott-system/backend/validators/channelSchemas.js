const { z } = require('zod');

const createChannelSchema = z.object({
  groupId: z.string().trim().min(24).max(24),
  name: z.string().trim().min(2).max(60),
  type: z.enum(['general', 'announcements', 'media', 'custom']).default('custom'),
});

const communityChannelParamSchema = z.object({
  communityId: z.string().trim().min(24).max(24),
});

module.exports = {
  createChannelSchema,
  communityChannelParamSchema,
};
