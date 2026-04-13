const mongoose = require('mongoose');

// Feature 4: Join Approval - Duyệt thành viên tham gia nhóm
const joinRequestSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Người giới thiệu (nếu vào qua invite link)
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Lý do/tin nhắn đi kèm (optional)
    reason: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    // Admin đã xử lý request này
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// 1 user chỉ có 1 pending request cho 1 conversation
joinRequestSchema.index({ conversationId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('JoinRequest', joinRequestSchema);
