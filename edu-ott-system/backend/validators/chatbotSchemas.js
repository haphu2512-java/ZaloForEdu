const { z } = require('zod');

const askChatbotSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().trim().min(1).max(4000),
    }),
  ).optional(),
});

module.exports = {
  askChatbotSchema,
};
