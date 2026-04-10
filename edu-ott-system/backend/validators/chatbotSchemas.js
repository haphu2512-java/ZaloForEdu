const { z } = require('zod');

const askChatbotSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

module.exports = {
  askChatbotSchema,
};
