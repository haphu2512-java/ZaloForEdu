const { z } = require('zod');

const createConversationSchema = z.object({
  type: z.enum(['direct', 'group']).default('direct'),
  name: z.string().trim().min(1).max(120).optional(),
  participantIds: z.array(z.string().trim().min(24).max(24)).min(1),
});

const conversationPaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
});

module.exports = {
  createConversationSchema,
  conversationPaginationQuerySchema,
};
