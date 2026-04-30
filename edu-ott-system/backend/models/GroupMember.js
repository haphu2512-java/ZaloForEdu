const mongoose = require('mongoose');

const groupMemberSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'mod', 'member'],
      default: 'member',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'banned', 'pending'],
      default: 'active',
      index: true,
    },
    mutedUntil: {
      type: Date,
      default: null,
    },
    lastActiveAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

groupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('GroupMember', groupMemberSchema);
