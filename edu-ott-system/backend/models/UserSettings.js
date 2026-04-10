const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system',
    },
    notifications: {
      pushEnabled: { type: Boolean, default: true },
      messageEnabled: { type: Boolean, default: true },
      groupEnabled: { type: Boolean, default: true },
      soundEnabled: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('UserSettings', userSettingsSchema);
