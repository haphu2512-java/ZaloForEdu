const mongoose = require('mongoose');

const callSessionSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, index: true },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    callType: { type: String, enum: ['audio', 'video'], default: 'video' },
    isGroup: { type: Boolean, default: false },
    initiator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    participants: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        joinedAt: { type: Date },
        leftAt: { type: Date },
        status: {
          type: String,
          enum: ['invited', 'ringing', 'accepted', 'declined', 'missed', 'busy', 'left'],
          default: 'invited',
        },
      },
    ],
    status: {
      type: String,
      enum: ['ringing', 'active', 'ended', 'missed', 'declined'],
      default: 'ringing',
      index: true,
    },
    startedAt: { type: Date },
    endedAt: { type: Date },
    durationSeconds: { type: Number, default: 0 },
    endReason: {
      type: String,
      enum: ['normal', 'timeout', 'declined', 'busy', 'error', 'cancelled'],
    },
  },
  { timestamps: true },
);

// TTL index: auto-cleanup sessions older than 30 days
callSessionSchema.index({ endedAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });

module.exports = mongoose.model('CallSession', callSessionSchema);
