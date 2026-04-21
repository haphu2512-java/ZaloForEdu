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
    // ── Ghim hội thoại lên đầu danh sách ──
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    pinnedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

conversationPreferenceSchema.index({ userId: 1, conversationId: 1 }, { unique: true });
// Index để sort: pinned conversations của user trước
conversationPreferenceSchema.index({ userId: 1, isPinned: -1, pinnedAt: -1 });

module.exports = mongoose.model('ConversationPreference', conversationPreferenceSchema);
