const { z } = require('zod');

const requestFriendSchema = z.object({
  toUserId: z.string().trim().min(24).max(24),
});

const requestIdParamSchema = z.object({
  id: z.string().trim().min(24).max(24),
});

const friendIdParamSchema = z.object({
  friendId: z.string().trim().min(24).max(24),
});

const friendPaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
});

module.exports = {
  requestFriendSchema,
  requestIdParamSchema,
  friendIdParamSchema,
  friendPaginationQuerySchema,
};
