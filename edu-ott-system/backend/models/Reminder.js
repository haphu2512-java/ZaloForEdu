const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    remindAt: {
      type: Date,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'done', 'expired'],
      default: 'pending',
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Reminder', reminderSchema);
