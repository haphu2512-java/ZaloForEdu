const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema(
  {
    targetType: {
      type: String,
      enum: ['post', 'comment'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    emoji: {
      type: String,
      enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry'],
      default: 'like',
    },
  },
  { timestamps: true },
);

reactionSchema.index({ targetType: 1, targetId: 1, userId: 1 }, { unique: true });
reactionSchema.index({ targetId: 1, targetType: 1 });

module.exports = mongoose.model('Reaction', reactionSchema);
