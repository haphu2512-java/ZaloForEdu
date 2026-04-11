const { z } = require('zod');

const uploadMediaSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(3).max(120),
  contentBase64: z.string().min(1),
});

const cloudinarySignatureSchema = z.object({
  folder: z.string().trim().min(1).max(255).optional(),
  publicId: z.string().trim().min(1).max(255).optional(),
  resourceType: z.enum(['image', 'video', 'raw', 'auto']).optional(),
}).default({});

const registerCloudinaryMediaSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(3).max(120),
  size: z.coerce.number().int().min(1),
  url: z.string().trim().url(),
  publicId: z.string().trim().min(1).max(255),
  resourceType: z.enum(['image', 'video', 'raw', 'auto']).default('auto'),
});

const mediaIdParamSchema = z.object({
  id: z.string().trim().min(24).max(24),
});

module.exports = {
  uploadMediaSchema,
  mediaIdParamSchema,
  cloudinarySignatureSchema,
  registerCloudinaryMediaSchema,
};
