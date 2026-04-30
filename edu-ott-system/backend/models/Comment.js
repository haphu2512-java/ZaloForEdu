const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
    content: {
      type: String,
      trim: true,
      maxlength: 2000,
      required: true,
    },
    reactionsCount: { type: Number, default: 0 },
    repliesCount: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

commentSchema.index({ postId: 1, createdAt: -1 });
commentSchema.index({ parentId: 1 });

module.exports = mongoose.model('Comment', commentSchema);
