const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: '',
    },
    mediaIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Media',
      },
    ],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    forwardFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    deliveredTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    seenBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isRecalled: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'poll', 'system', 'system_reminder', 'announcement'],
      default: 'text',
    },
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      default: null,
      index: true,
    },
    isPinnedAnnouncement: {
      type: Boolean,
      default: false,
    },
    pollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Poll',
      default: null,
    },
    reminderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reminder',
      default: null,
    },
    // @Mention: danh sách user được nhắc đến
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // @all: nhắc tất cả thành viên
    mentionAll: {
      type: Boolean,
      default: false,
    },
    deletedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String },
      },
    ],
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, channelId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
