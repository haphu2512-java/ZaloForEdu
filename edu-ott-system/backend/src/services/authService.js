const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const AppError = require('../utils/appError');
const emailService = require('./emailService');

// Helper to generate access token
const generateAccessToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '15m', // Short-lived
    });
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Helper to generate refresh token
const generateRefreshToken = async (user, ipAddress) => {
    const token = crypto.randomBytes(40).toString('hex');
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const refreshToken = await RefreshToken.create({
        user: user._id,
        token: hashToken(token),
        expires,
        createdByIp: ipAddress,
    });

    return { refreshToken, token };
};

exports.register = async (userData) => {
    const { email, password, fullName, role } = userData;

    if (await User.findOne({ email })) {
        throw new AppError('Email already registered', 400);
    }

    const user = await User.create({
        email,
        password,
        fullName,
        role,
        isEmailVerified: false,
        isActive: true,
    });

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = hashToken(verificationToken);

    user.emailVerificationToken = verificationTokenHash;
    user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    // Gửi email xác thực
    try {
        await emailService({
            email: user.email,
            subject: 'Zalo Edu - Xác thực địa chỉ email',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h1 style="color: #2563EB;">Chào mừng bạn đến với Zalo Edu!</h1>
                    <p>Cảm ơn bạn đã đăng ký tài khoản. Để bảo mật, vui lòng xác thực địa chỉ email của bạn bằng mã dưới đây:</p>
                    <div style="background-color: #F8FAFC; padding: 20px; text-align: center; border-radius: 12px; margin: 30px 0;">
                        <h2 style="color: #6366F1; letter-spacing: 6px; margin: 0; font-size: 32px;">${verificationToken}</h2>
                    </div>
                    <p style="color: #64748B; font-size: 14px;">Mã này sẽ hết hạn sau 24 giờ. Hãy sao chép và dán vào ứng dụng di động để kích hoạt tài khoản ngay.</p>
                    <br>
                    <hr style="border: none; border-top: 1px solid #E2E8F0;"/>
                    <p style="font-size: 13px; color: #94A3B8;">Trân trọng,<br>Đội ngũ Zalo Edu</p>
                </div>
            `,
            text: `Chào mừng bạn! Mã xác thực của bạn là: ${verificationToken}\n\nMã hết hạn sau 24 giờ.`
        });
    } catch (error) {
        console.error('Failed to send verification email:', error);
    }
    return { user, verificationToken };
};

exports.login = async (email, password, ipAddress) => {
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
        throw new AppError('Invalid email or password', 401);
    }

    if (!user.isEmailVerified) {
        const error = new AppError('Tài khoản chưa xác thực email. Vui lòng kiểm tra hộp thư hoặc gửi lại mã xác thực.', 403);
        error.errorCode = 'EMAIL_NOT_VERIFIED';
        error.email = email;
        throw error;
    }
    if (!user.isActive) {
        throw new AppError('Account is deactivated', 401);
    }

    const accessToken = generateAccessToken(user._id);
    const { refreshToken, token: rawRefreshToken } = await generateRefreshToken(user, ipAddress);

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    return {
        user,
        accessToken,
        refreshToken: rawRefreshToken
    };
};

exports.logout = async (token, ipAddress) => {
    // Revoke refresh token associated with the used access token? 
    // Or just revoke the refresh token sent in body
    // Since we receive refreshToken usually for logout in this design:
    if (!token) return;

    const refreshToken = await RefreshToken.findOne({ token: hashToken(token) });
    if (!refreshToken) return; // Already gone or invalid

    refreshToken.revoked = new Date();
    refreshToken.revokedByIp = ipAddress;
    await refreshToken.save();
};

exports.refreshToken = async (token, ipAddress) => {
    const refreshToken = await RefreshToken.findOne({ token: hashToken(token) })
        .populate('user');

    if (!refreshToken || !refreshToken.isActive) {
        throw new AppError('Invalid refresh token', 401);
    }

    const { user } = refreshToken;

    if (!user || !user.isActive) {
        throw new AppError('Account is deactivated', 401);
    }

    if (!user.isEmailVerified) {
        throw new AppError('Please verify your email', 401);
    }

    // Replace old refresh token with new one (Rotation)
    const { refreshToken: newRefreshToken, token: rawRefreshToken } = await generateRefreshToken(user, ipAddress);

    refreshToken.revoked = new Date();
    refreshToken.revokedByIp = ipAddress;
    refreshToken.replacedByToken = newRefreshToken.token;
    await refreshToken.save();

    const accessToken = generateAccessToken(user._id);

    return {
        accessToken,
        refreshToken: rawRefreshToken
    };
};

exports.verifyEmail = async (token) => {
    const verificationTokenHash = hashToken(token);

    const user = await User.findOne({
        emailVerificationToken: verificationTokenHash,
        emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
        throw new AppError('Invalid or expired verification token', 400);
    }

    if (user.isEmailVerified) return;

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });
};
