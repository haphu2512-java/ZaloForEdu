const Post = require('../models/Post');
const User = require('../models/User');
const Reaction = require('../models/Reaction');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');
const { encodeCursor, decodeCursor } = require('../utils/cursor');

/**
 * POST /api/v1/social/posts
 */
const createPost = asyncHandler(async (req, res) => {
  const { content, mediaUrls, privacy } = req.body;

  if (!content && (!mediaUrls || mediaUrls.length === 0)) {
    throw new ApiError(400, 'EMPTY_POST', 'Post must have content or media');
  }

  const post = await Post.create({
    authorId: req.user._id,
    content: content?.trim() || '',
    mediaUrls: mediaUrls || [],
    privacy: privacy || 'public',
  });

  await post.populate('authorId', 'username avatarUrl');

  return successResponse(res, post, 'Post created', 201);
});

/**
 * GET /api/v1/social/posts/feed
 */
const getFeed = asyncHandler(async (req, res) => {
  const { cursor, limit = 20 } = req.query;
  const parsedLimit = Math.min(parseInt(limit, 10) || 20, 50);

  const userId = req.user._id;
  const user = await User.findById(userId).select('friends');
  const friendIds = user?.friends || [];
  const visibleAuthors = [userId, ...friendIds];

  const query = {
    deletedAt: null,
    $or: [
      { authorId: { $in: visibleAuthors } },
      { privacy: 'public' },
    ],
  };

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      query.$or = [
        { createdAt: { $lt: decoded.createdAt } },
        { createdAt: decoded.createdAt, _id: { $lt: decoded.id } },
      ];
      // Override: cursor-based filter takes precedence
      query.$and = [
        {
          $or: [
            { authorId: { $in: visibleAuthors } },
            { privacy: 'public' },
          ],
        },
        {
          $or: [
            { createdAt: { $lt: decoded.createdAt } },
            { createdAt: decoded.createdAt, _id: { $lt: decoded.id } },
          ],
        },
      ];
      delete query.$or;
    }
  }

  const posts = await Post.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(parsedLimit + 1)
    .populate('authorId', 'username avatarUrl')
    .lean();

  const hasMore = posts.length > parsedLimit;
  const items = hasMore ? posts.slice(0, parsedLimit) : posts;

  // Attach current user's reaction to each post
  const postIds = items.map((p) => p._id);
  const myReactions = await Reaction.find({
    targetType: 'post',
    targetId: { $in: postIds },
    userId,
  }).lean();
  const reactionMap = {};
  myReactions.forEach((r) => { reactionMap[r.targetId.toString()] = r.emoji; });

  const enriched = items.map((p) => ({
    ...p,
    myReaction: reactionMap[p._id.toString()] || null,
  }));

  const nextCursor = hasMore && items.length > 0
    ? encodeCursor({ createdAt: items[items.length - 1].createdAt, id: items[items.length - 1]._id })
    : null;

  return successResponse(res, { items: enriched, nextCursor, hasMore }, 'Feed fetched');
});

/**
 * GET /api/v1/social/posts/user/:userId
 */
const getUserPosts = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { cursor, limit = 20 } = req.query;
  const parsedLimit = Math.min(parseInt(limit, 10) || 20, 50);

  const query = { authorId: userId, deletedAt: null };

  // Only show friends/private posts if viewing own profile or friend
  const isSelf = req.user._id.toString() === userId;
  if (!isSelf) {
    const viewer = await User.findById(req.user._id).select('friends');
    const isFriend = (viewer?.friends || []).some((f) => f.toString() === userId);
    if (isFriend) {
      query.privacy = { $in: ['public', 'friends'] };
    } else {
      query.privacy = 'public';
    }
  }

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      query.createdAt = { $lt: decoded.createdAt };
    }
  }

  const posts = await Post.find(query)
    .sort({ createdAt: -1 })
    .limit(parsedLimit + 1)
    .populate('authorId', 'username avatarUrl')
    .lean();

  const hasMore = posts.length > parsedLimit;
  const items = hasMore ? posts.slice(0, parsedLimit) : posts;

  const postIds = items.map((p) => p._id);
  const myReactions = await Reaction.find({
    targetType: 'post',
    targetId: { $in: postIds },
    userId: req.user._id,
  }).lean();
  const reactionMap = {};
  myReactions.forEach((r) => { reactionMap[r.targetId.toString()] = r.emoji; });

  const enriched = items.map((p) => ({
    ...p,
    myReaction: reactionMap[p._id.toString()] || null,
  }));

  const nextCursor = hasMore && items.length > 0
    ? encodeCursor({ createdAt: items[items.length - 1].createdAt, id: items[items.length - 1]._id })
    : null;

  return successResponse(res, { items: enriched, nextCursor, hasMore }, 'User posts fetched');
});

/**
 * GET /api/v1/social/posts/:postId
 */
const getPostById = asyncHandler(async (req, res) => {
  const post = await Post.findOne({ _id: req.params.postId, deletedAt: null })
    .populate('authorId', 'username avatarUrl')
    .lean();

  if (!post) throw new ApiError(404, 'POST_NOT_FOUND', 'Post not found');

  const myReaction = await Reaction.findOne({
    targetType: 'post',
    targetId: post._id,
    userId: req.user._id,
  }).lean();

  return successResponse(res, { ...post, myReaction: myReaction?.emoji || null }, 'Post fetched');
});

/**
 * PUT /api/v1/social/posts/:postId
 */
const updatePost = asyncHandler(async (req, res) => {
  const post = await Post.findOne({ _id: req.params.postId, deletedAt: null });
  if (!post) throw new ApiError(404, 'POST_NOT_FOUND', 'Post not found');
  if (post.authorId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'FORBIDDEN', 'You can only edit your own posts');
  }

  const { content, mediaUrls, privacy } = req.body;
  if (content !== undefined) post.content = content.trim();
  if (mediaUrls !== undefined) post.mediaUrls = mediaUrls;
  if (privacy !== undefined) post.privacy = privacy;
  post.isEdited = true;
  await post.save();

  await post.populate('authorId', 'username avatarUrl');
  return successResponse(res, post, 'Post updated');
});

const cloudinaryService = require('../services/cloudinaryService');

const extractCloudinaryPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  try {
    const splitByUpload = url.split('/upload/');
    if (splitByUpload.length !== 2) return null;
    
    const pathPart = splitByUpload[1];
    const parts = pathPart.split('/');
    
    // Remove version tag if it exists (e.g., v1234567890)
    if (parts[0].startsWith('v') && !isNaN(parts[0].substring(1))) {
      parts.shift();
    }
    
    const fullPath = parts.join('/');
    const lastDotIdx = fullPath.lastIndexOf('.');
    if (lastDotIdx !== -1) {
      return fullPath.substring(0, lastDotIdx);
    }
    return fullPath;
  } catch (err) {
    console.error('Error parsing Cloudinary URL', err);
    return null;
  }
};

/**
 * DELETE /api/v1/social/posts/:postId
 */
const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findOne({ _id: req.params.postId, deletedAt: null });
  if (!post) throw new ApiError(404, 'POST_NOT_FOUND', 'Post not found');
  if (post.authorId.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'FORBIDDEN', 'You can only delete your own posts');
  }

  // Soft delete the post
  post.deletedAt = new Date();
  await post.save();

  // Permanently delete associated media from Cloudinary
  if (post.mediaUrls && post.mediaUrls.length > 0 && cloudinaryService.isConfigured()) {
    post.mediaUrls.forEach((url) => {
      const publicId = extractCloudinaryPublicId(url);
      if (publicId) {
        cloudinaryService.destroyAsset({ publicId, resourceType: 'image' })
          .then((result) => console.log(`Deleted Cloudinary asset ${publicId}:`, result))
          .catch((err) => console.error(`Failed to delete Cloudinary asset ${publicId}:`, err));
      }
    });
  }

  return successResponse(res, {}, 'Post deleted');
});

module.exports = { createPost, getFeed, getUserPosts, getPostById, updatePost, deletePost };
