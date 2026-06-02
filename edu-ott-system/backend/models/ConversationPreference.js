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
    // Timestamp ghi lại lúc user xóa lịch sử — dùng để lọc tin nhắn cũ
    deletedHistoryAt: {
      type: Date,
      default: null,
    },
    mutedUntil: {
      type: Date,
      default: null,
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    pinnedAt: {
      type: Date,
      default: null,
    },
    isMuted: {
      type: Boolean,
      default: false,
    },
    // Notification mode: all, mention_only, mute
    notificationMode: {
      type: String,
      enum: ['all', 'mention_only', 'mute'],
      default: 'all',
    },
  },
  { timestamps: true },
);

conversationPreferenceSchema.index({ userId: 1, conversationId: 1 }, { unique: true });
// Index to sort pinned conversations first for each user
conversationPreferenceSchema.index({ userId: 1, isPinned: -1, pinnedAt: -1 });

module.exports = mongoose.model('ConversationPreference', conversationPreferenceSchema);