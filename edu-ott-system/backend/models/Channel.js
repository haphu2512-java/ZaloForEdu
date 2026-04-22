const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      required: true,
      maxlength: 60,
    },
    type: {
      type: String,
      enum: ['general', 'announcements', 'media', 'custom'],
      default: 'custom',
    },
  },
  { timestamps: true },
);

channelSchema.index({ groupId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Channel', channelSchema);
