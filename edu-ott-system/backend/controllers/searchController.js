const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');
const { encodeCursor, decodeCursor } = require('../utils/cursor');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const searchMessages = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const { cursor } = req.query;
  const queryRegex = new RegExp(escapeRegex(q), 'i');

  const conversations = await Conversation.find({ participants: req.user._id }).select('_id');
  const conversationIds = conversations.map((conversation) => conversation._id);

  if (conversationIds.length === 0) {
    return successResponse(
      res,
      {
        items: [],
        nextCursor: null,
        limit,
      },
      'Message search result',
    );
  }

  const filter = {
    conversationId: { $in: conversationIds },
    content: queryRegex,
  };

  // Apply cursor filter
  const query = { ...filter };
  if (cursor) {
    const parsed = decodeCursor(cursor);
    if (!parsed) {
      throw new ApiError(400, 'INVALID_CURSOR', 'Cursor is invalid');
    }
    query.$or = [
      { createdAt: { $lt: parsed.createdAt } },
      {
        createdAt: parsed.createdAt,
        _id: { $lt: parsed.id },
      },
    ];
  }

  const items = await Message.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .populate('senderId', 'username avatarUrl')
    .populate('conversationId', 'type name participants');

  let nextCursor = null;
  let finalItems = items;

  if (items.length > limit) {
    const nextItem = items[limit - 1];
    nextCursor = encodeCursor({
      createdAt: nextItem.createdAt,
      id: nextItem._id.toString(),
    });
    finalItems = items.slice(0, limit);
  }

  return successResponse(
    res,
    {
      items: finalItems,
      nextCursor,
      limit,
    },
    'Message search result',
  );
});

const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const { cursor } = req.query;
  const queryRegex = new RegExp(escapeRegex(q), 'i');

  const filter = {
    deletedAt: null,
    $or: [{ username: queryRegex }, { email: queryRegex }, { phone: queryRegex }],
  };

  // Apply cursor filter
  const query = { ...filter };
  if (cursor) {
    const parsed = decodeCursor(cursor);
    if (!parsed) {
      throw new ApiError(400, 'INVALID_CURSOR', 'Cursor is invalid');
    }
    // Merge with existing $or condition for search + pagination cursor
    query.$or = [
      ...(filter.$or || []),
      { updatedAt: { $lt: parsed.createdAt } },
      {
        updatedAt: parsed.createdAt,
        _id: { $lt: parsed.id },
      },
    ];
  }

  const items = await User.find(query)
    .select('username email phone avatarUrl isOnline lastSeen')
    .sort({ isOnline: -1, updatedAt: -1 })
    .limit(limit + 1);

  let nextCursor = null;
  let finalItems = items;

  if (items.length > limit) {
    const nextItem = items[limit - 1];
    nextCursor = encodeCursor({
      createdAt: nextItem.updatedAt,
      id: nextItem._id.toString(),
    });
    finalItems = items.slice(0, limit);
  }

  return successResponse(
    res,
    {
      items: finalItems,
      nextCursor,
      limit,
    },
    'User search result',
  );
});

module.exports = {
  searchMessages,
  searchUsers,
};
