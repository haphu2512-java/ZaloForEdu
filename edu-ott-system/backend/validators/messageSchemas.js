const { z } = require('zod');

const sendMessageSchema = z.object({
  conversationId: z.string().trim().min(24).max(24),
  content: z.string().trim().max(5000).default(''),
  mediaIds: z.array(z.string().trim().min(24).max(24)).default([]),
  replyTo: z.string().trim().min(24).max(24).optional(),
  forwardFrom: z.string().trim().min(24).max(24).optional(),
});

const conversationParamSchema = z.object({
  id: z.string().trim().min(24).max(24),
});

const messageIdParamSchema = z.object({
  id: z.string().trim().min(24).max(24),
});

const messagePaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().trim().optional(),
});

const reactMessageSchema = z.object({
  emoji: z.string().trim().optional(),
});

module.exports = {
  sendMessageSchema,
  conversationParamSchema,
  messageIdParamSchema,
  messagePaginationQuerySchema,
  reactMessageSchema,
};
