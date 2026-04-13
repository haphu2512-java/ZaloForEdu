const mongoose = require('mongoose');

// Feature 1: Polls (Bình chọn) - dùng trong nhóm lớp
const pollSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Tin nhắn hệ thống gắn với poll này (để hiển thị trong chat)
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    options: [
      {
        text: { type: String, required: true, trim: true, maxlength: 200 },
        votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      },
    ],
    isMultipleChoice: {
      type: Boolean,
      default: false,
    },
    allowAddOptions: {
      type: Boolean,
      default: false,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    expiredAt: {
      type: Date,
      default: null,
    },
    isClosed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

pollSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model('Poll', pollSchema);
