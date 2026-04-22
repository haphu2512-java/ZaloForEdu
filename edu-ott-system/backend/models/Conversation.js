const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['direct', 'group', 'community'],
      default: 'direct',
      required: true,
    },
    privacy: {
      type: String,
      enum: ['public', 'private'],
      default: 'private',
    },
    name: {
      type: String,
      trim: true,
      default: null,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    adminIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Legacy single pin - kept for backward compat
    pinnedMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    // Feature 2: Multiple pinned items (Bảng tin)
    pinnedItems: [
      {
        messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true },
        pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        pinnedAt: { type: Date, default: Date.now },
      },
    ],
    nicknames: {
      type: Map,
      of: String,
      default: {},
    },
    lastMessageAt: {
      type: Date,
      default: null,
      index: true,
    },
    // ID người gửi tin nhắn đầu tiên — dùng để phân loại "Tin nhắn từ người lạ"
    firstSenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Feature 4: Join approval (Duyệt thành viên)
    settings: {
      isApprovalRequired: { type: Boolean, default: false },
      joinMode: { type: String, enum: ['invite', 'approval'], default: 'invite' },
      canMembersUpdateInfo: { type: Boolean, default: true },
      canMembersPin: { type: Boolean, default: true },
      canMembersCreateReminders: { type: Boolean, default: true },
      canMembersCreatePolls: { type: Boolean, default: true },
      canMembersSendMessages: { type: Boolean, default: true },
      markAdminMessages: { type: Boolean, default: true },
      allowNewMembersReadHistory: { type: Boolean, default: true },
      allowInviteLink: { type: Boolean, default: true },
    },
    blockedMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Feature 5: Invite link
    inviteCode: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },
    messageHistoryLimitPerChannel: {
      type: Number,
      default: 2000,
      min: 100,
      max: 10000,
    },
  },
  { timestamps: true },
);

conversationSchema.index({ participants: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
