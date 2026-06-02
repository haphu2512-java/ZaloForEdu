const { z } = require('zod');

const phoneSchema = z
  .string()
  .trim()
  .regex(/^(0|\+84)(3|5|7|8|9)\d{8}$/, 'Số điện thoại Việt Nam không hợp lệ (VD: 0912345678)');

const registerSchema = z
  .object({
    username: z.string().trim().min(3).max(50).optional(),
    email: z.string().trim().email('Email không đúng định dạng').regex(/@gmail\.com$/, 'Chỉ hỗ trợ đăng ký bằng @gmail.com').optional(),
    password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất một số').regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất một chữ in hoa').max(100),
    phone: phoneSchema.optional(),
  })
  .refine((input) => input.email || input.phone, {
    message: 'Cần cung cấp email hoặc số điện thoại',
  });

const loginSchema = z
  .object({
    email: z.string().trim().email('Email không đúng định dạng').regex(/@gmail\.com$/, 'Chỉ hỗ trợ Gmail').optional(),
    username: z.string().trim().min(3).max(50).optional(),
    phone: phoneSchema.optional(),
    password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').max(100),
    device: z.enum(['web', 'mobile']).optional(), // Allow device parameter for session management
  })
  .refine((input) => input.email || input.username || input.phone, {
    message: 'Either email, username, or phone is required',
  });

const refreshSchema = z.object({
  refreshToken: z.string().min(20),
  device: z.enum(['web', 'mobile']).optional(), // Allow device parameter (though not used in rotation)
});

const forgotPasswordSchema = z
  .object({
    email: z.string().trim().email().regex(/@gmail\.com$/, 'Chỉ hỗ trợ Gmail').optional(),
    phone: phoneSchema.optional(),
  })
  .refine((input) => input.email || input.phone, {
    message: 'Either email or phone is required',
  });

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(6).max(100),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6).max(100),
  newPassword: z.string().min(6).max(100),
});

const verifyEmailSchema = z.object({
  token: z.string().trim().regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

const resendVerificationSchema = z.object({
  email: z.string().trim().email().regex(/@gmail\.com$/, 'Chỉ hỗ trợ Gmail'),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
};
