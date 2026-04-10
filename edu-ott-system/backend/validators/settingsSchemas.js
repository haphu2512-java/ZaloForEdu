const { z } = require('zod');

const updateSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  notifications: z
    .object({
      pushEnabled: z.boolean().optional(),
      messageEnabled: z.boolean().optional(),
      groupEnabled: z.boolean().optional(),
      soundEnabled: z.boolean().optional(),
    })
    .optional(),
});

module.exports = {
  updateSettingsSchema,
};
