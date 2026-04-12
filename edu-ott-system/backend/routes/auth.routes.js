const express = require('express');
const { z } = require('zod');

const authController = require('../controllers/authController');
const auth = require('../middlewares/auth');
const { createRateLimiter } = require('../middlewares/rateLimiter');
const validate = require('../middlewares/validate');
const {
  loginSchema,
  refreshSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} = require('../validators/authSchemas');

const router = express.Router();

// ─── Rate limiters ────────────────────────────────────────────
const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  code: 'AUTH_RATE_LIMITED',
  message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.',
});

// Strict limiter for OTP sends (register, resend, forgot)
const otpLimiter = createRateLimiter({
  windowMs: 60 * 1000,    // 1 minute window
  max: 2,                  // max 2 OTP sends per minute per IP
  code: 'OTP_RATE_LIMITED',
  message: 'Bạn đã gửi quá nhiều mã OTP. Vui lòng chờ 1 phút.',
});

// Very strict for register (prevent spam account creation)
const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5,                    // max 5 accounts per hour per IP
  code: 'REGISTER_RATE_LIMITED',
  message: 'Quá nhiều lần đăng ký. Vui lòng thử lại sau 1 giờ.',
});

// Inline schemas for new endpoints
const verifyOtpSchema = z.object({
  token: z.string().trim().regex(/^\d{6}$/, 'OTP phải là 6 chữ số'),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().regex(/^\+?\d{8,15}$/).optional(),
}).refine((d) => d.email || d.phone, { message: 'Cần email hoặc số điện thoại' });

const resendOtpSchema = z.object({
  email: z.string().trim().email().optional(),
  phone: z.string().trim().regex(/^\+?\d{8,15}$/).optional(),
}).refine((d) => d.email || d.phone, { message: 'Cần email hoặc số điện thoại' });

const verifyForgotOtpSchema = z.object({
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP phải là 6 chữ số'),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().regex(/^\+?\d{8,15}$/).optional(),
}).refine((d) => d.email || d.phone, { message: 'Cần email hoặc số điện thoại' });

// loginSchema accepts email/username/phone — device is handled in controller (not validated strictly)

// ─── Routes ──────────────────────────────────────────────────

// Register
router.post('/register', registerLimiter, otpLimiter, validate({ body: registerSchema }), authController.register);

// Login (device field is passed in body, controller handles default 'web')
router.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);

// Token management
router.post('/refresh-token', validate({ body: refreshSchema }), authController.refreshToken);
router.post('/logout', validate({ body: refreshSchema }), authController.logout);
router.post('/logout-all', auth, authController.logoutAll);

// Get current user
router.get('/me', auth, authController.getMe);

// OTP verification (email or phone)
router.post('/verify-otp', authLimiter, validate({ body: verifyOtpSchema }), authController.verifyOtp);
// Backward compat alias
router.post('/verify-email', authLimiter, validate({ body: verifyOtpSchema }), authController.verifyOtp);

// Resend OTP
router.post('/resend-otp', otpLimiter, validate({ body: resendOtpSchema }), authController.resendOtp);
// Backward compat alias
router.post('/resend-verification', otpLimiter, validate({ body: resendOtpSchema }), authController.resendOtp);

// Forgot password – 3-step flow
// Step 1: Send OTP to email/phone
router.post('/forgot-password', otpLimiter, validate({ body: forgotPasswordSchema }), authController.forgotPassword);
// Step 2: Verify OTP → get resetToken
router.post('/verify-forgot-otp', authLimiter, validate({ body: verifyForgotOtpSchema }), authController.verifyForgotOtp);
// Step 3: Use resetToken to set new password
router.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), authController.resetPassword);

// Change password (authenticated)
router.post('/change-password', auth, authLimiter, validate({ body: changePasswordSchema }), authController.changePassword);

module.exports = router;
