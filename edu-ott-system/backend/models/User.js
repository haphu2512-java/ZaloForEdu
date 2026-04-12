const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      trim: true,
      minlength: 3,
      maxlength: 50,
      unique: true,
      sparse: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Global token version (legacy / fallback)
    tokenVersion: {
      type: Number,
      default: 0,
    },
    // Per-device token versions (Zalo-style single-device-per-type login)
    webTokenVersion: {
      type: Number,
      default: 0,
    },
    mobileTokenVersion: {
      type: Number,
      default: 0,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      default: null,
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
    },
    // Generic OTP for phone verification, forgot-password via phone
    otpCode: {
      type: String,
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    otpType: {
      type: String,
      enum: ['phone_verify', 'forgot_password', null],
      default: null,
    },
    // Anti-spam: track when last OTP was sent
    lastOtpSentAt: {
      type: Date,
      default: null,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.tokenVersion;
        delete ret.webTokenVersion;
        delete ret.mobileTokenVersion;
        delete ret.otpCode;
        delete ret.otpExpires;
        delete ret.otpType;
        delete ret.lastOtpSentAt;
        return ret;
      },
    },
  },
);

module.exports = mongoose.model('User', userSchema);
