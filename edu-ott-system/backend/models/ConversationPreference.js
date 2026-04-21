const mongoose = require('mongoose');

const conversationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['primary', 'work', 'family', 'other'],
      default: 'primary',
    },
    nickname: {
      type: String,
      trim: true,
      default: null,
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    mutedUntil: {
      type: Date,
      default: null,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isMuted: {
      type: Boolean,
      default: false,
    },
    // Chế độ thông báo: all, mention_only, mute
    notificationMode: {
      type: String,
      enum: ['all', 'mention_only', 'mute'],
      default: 'all',
    },
  },
  { timestamps: true },
);

conversationPreferenceSchema.index({ userId: 1, conversationId: 1 }, { unique: true });

module.exports = mongoose.model('ConversationPreference', conversationPreferenceSchema);
