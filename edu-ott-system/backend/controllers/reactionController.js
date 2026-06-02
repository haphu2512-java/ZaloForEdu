const Reaction = require('../models/Reaction');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');

/**
 * PUT /api/v1/social/reactions
 * Toggle or change reaction. Send emoji=null to remove.
 */
const toggleReaction = asyncHandler(async (req, res) => {
  const { targetType, targetId, emoji } = req.body;
  const userId = req.user._id;

  if (!['post', 'comment'].includes(targetType)) {
    throw new ApiError(400, 'INVALID_TARGET', 'targetType must be post or comment');
  }

  // Verify target exists
  if (targetType === 'post') {
    const post = await Post.findOne({ _id: targetId, deletedAt: null });
    if (!post) throw new ApiError(404, 'POST_NOT_FOUND', 'Post not found');
  } else {
    const comment = await Comment.findOne({ _id: targetId, deletedAt: null });
    if (!comment) throw new ApiError(404, 'COMMENT_NOT_FOUND', 'Comment not found');
  }

  const existing = await Reaction.findOne({ targetType, targetId, userId });

  if (!emoji || emoji === '') {
    // Remove reaction
    if (existing) {
      await existing.deleteOne();
      const Model = targetType === 'post' ? Post : Comment;
      await Model.findByIdAndUpdate(targetId, { $inc: { reactionsCount: -1 } });
    }
    return successResponse(res, { reacted: false }, 'Reaction removed');
  }

  if (existing) {
    // Update emoji
    existing.emoji = emoji;
    await existing.save();
    return successResponse(res, { reacted: true, emoji }, 'Reaction updated');
  }

  // Create new
  await Reaction.create({ targetType, targetId, userId, emoji });
  const Model = targetType === 'post' ? Post : Comment;
  await Model.findByIdAndUpdate(targetId, { $inc: { reactionsCount: 1 } });

  return successResponse(res, { reacted: true, emoji }, 'Reaction added');
});

/**
 * GET /api/v1/social/reactions/:targetType/:targetId
 */
const getReactions = asyncHandler(async (req, res) => {
  const { targetType, targetId } = req.params;
  const { limit = 50 } = req.query;

  const reactions = await Reaction.find({ targetType, targetId })
    .limit(Math.min(parseInt(limit, 10) || 50, 100))
    .populate('userId', 'username avatarUrl')
    .lean();

  // Summary by emoji
  const summary = {};
  reactions.forEach((r) => {
    summary[r.emoji] = (summary[r.emoji] || 0) + 1;
  });

  return successResponse(res, { reactions, summary }, 'Reactions fetched');
});

module.exports = { toggleReaction, getReactions };
