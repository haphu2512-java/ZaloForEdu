const { z } = require('zod');

const userIdParamSchema = z.object({
  id: z.string().trim().min(24).max(24),
});

const updateUserSchema = z.object({
  username: z.string().trim().min(3).max(50).optional(),
  email: z.union([z.string().trim().email(), z.null()]).optional(),
  phone: z.string().trim().min(8).max(20).nullable().optional(),
  avatarUrl: z.string().trim().url().nullable().optional(),
});

const blockUserBodySchema = z.object({
  action: z.enum(['block', 'unblock']).default('block'),
});

module.exports = {
  userIdParamSchema,
  updateUserSchema,
  blockUserBodySchema,
};
