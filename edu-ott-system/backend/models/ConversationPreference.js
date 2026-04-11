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
  },
  { timestamps: true },
);

conversationPreferenceSchema.index({ userId: 1, conversationId: 1 }, { unique: true });

module.exports = mongoose.model('ConversationPreference', conversationPreferenceSchema);
