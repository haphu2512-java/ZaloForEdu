const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const AppError = require('../utils/appError');
// const emailService = require('./emailService'); // To be implemented

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
    const { email, password, fullName } = userData;

    if (await User.findOne({ email })) {
        throw new AppError('Email already registered', 400);
    }

    const user = await User.create({
        email,
        password,
        fullName,
        role: 'student',
        isEmailVerified: false,
        isActive: true,
    });

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = hashToken(verificationToken);

    user.emailVerificationToken = verificationTokenHash;
    user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    // TODO: Send verification email

    return { user, verificationToken };
};

exports.login = async (email, password, ipAddress) => {
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
        throw new AppError('Invalid email or password', 401);
    }

    if (!user.isEmailVerified) {
        throw new AppError('Please verify your email', 401);
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
