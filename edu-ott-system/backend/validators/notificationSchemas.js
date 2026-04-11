const { z } = require('zod');

const notificationIdParamSchema = z.object({
  id: z.string().trim().min(24).max(24),
});

const notificationPaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).default(1),
});

module.exports = {
  notificationIdParamSchema,
  notificationPaginationQuerySchema,
};
