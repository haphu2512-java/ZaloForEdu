const Comment = require('../models/Comment');
const Post = require('../models/Post');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');
const { encodeCursor, decodeCursor } = require('../utils/cursor');

/**
 * POST /api/v1/social/posts/:postId/comments
 */
const createComment = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { content, parentId } = req.body;

  if (!content?.trim()) throw new ApiError(400, 'EMPTY_COMMENT', 'Comment cannot be empty');

  const post = await Post.findOne({ _id: postId, deletedAt: null });
  if (!post) throw new ApiError(404, 'POST_NOT_FOUND', 'Post not found');

  if (parentId) {
    const parent = await Comment.findOne({ _id: parentId, postId, deletedAt: null });
    if (!parent) throw new ApiError(404, 'PARENT_NOT_FOUND', 'Parent comment not found');
    parent.repliesCount += 1;
    await parent.save();
  }

  const comment = await Comment.create({
    postId,
    authorId: req.user._id,
    parentId: parentId || null,
    content: content.trim(),
  });

  post.commentsCount += 1;
  await post.save();

  await comment.populate('authorId', 'username avatarUrl');

  return successResponse(res, comment, 'Comment created', 201);
});

/**
 * GET /api/v1/social/posts/:postId/comments
 */
const getComments = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { cursor, limit = 20, parentId } = req.query;
  const parsedLimit = Math.min(parseInt(limit, 10) || 20, 50);

  const query = { postId, deletedAt: null, parentId: parentId || null };

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      query.createdAt = { $gt: decoded.createdAt };
    }
  }

  const comments = await Comment.find(query)
    .sort({ createdAt: 1 })
    .limit(parsedLimit + 1)
    .populate('authorId', 'username avatarUrl')
    .lean();

  const hasMore = comments.length > parsedLimit;
  const items = hasMore ? comments.slice(0, parsedLimit) : comments;

  const nextCursor = hasMore && items.length > 0
    ? encodeCursor({ createdAt: items[items.length - 1].createdAt, id: items[items.length - 1]._id })
    : null;

  return successResponse(res, { items, nextCursor, hasMore }, 'Comments fetched');
});

/**
 * DELETE /api/v1/social/posts/:postId/comments/:commentId
 */
const deleteComment = asyncHandler(async (req, res) => {
  const { postId, commentId } = req.params;

  const comment = await Comment.findOne({ _id: commentId, postId, deletedAt: null });
  if (!comment) throw new ApiError(404, 'COMMENT_NOT_FOUND', 'Comment not found');
  if (comment.authorId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'FORBIDDEN', 'You can only delete your own comments');
  }

  comment.deletedAt = new Date();
  await comment.save();

  await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: -1 } });

  if (comment.parentId) {
    await Comment.findByIdAndUpdate(comment.parentId, { $inc: { repliesCount: -1 } });
  }

  return successResponse(res, {}, 'Comment deleted');
});

module.exports = { createComment, getComments, deleteComment };
