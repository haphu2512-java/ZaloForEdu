const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  expires: {
    type: Date,
    required: true,
  },
  createdByIp: {
    type: String,
    default: null,
  },
  revoked: {
    type: Date,
    default: null,
  },
  revokedByIp: {
    type: String,
    default: null,
  },
  replacedByToken: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// Virtual: kiểm tra token còn hiệu lực không
refreshTokenSchema.virtual('isExpired').get(function () {
  return Date.now() >= this.expires;
});

// Virtual: kiểm tra token có bị thu hồi không
refreshTokenSchema.virtual('isActive').get(function () {
  return !this.revoked && !this.isExpired;
});

// Indexes
refreshTokenSchema.index({ user: 1 });
refreshTokenSchema.index({ token: 1 });
refreshTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 }); // TTL: tự xóa khi hết hạn

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
