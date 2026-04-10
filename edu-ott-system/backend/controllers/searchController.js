const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const searchMessages = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const page = Number(req.query.page);
  const limit = Number(req.query.limit);
  const skip = (page - 1) * limit;
  const queryRegex = new RegExp(escapeRegex(q), 'i');

  const conversations = await Conversation.find({ participants: req.user._id }).select('_id');
  const conversationIds = conversations.map((conversation) => conversation._id);

  if (conversationIds.length === 0) {
    return successResponse(
      res,
      {
        items: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      },
      'Message search result',
    );
  }

  const filter = {
    conversationId: { $in: conversationIds },
    content: queryRegex,
  };

  const [items, total] = await Promise.all([
    Message.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'username avatarUrl')
      .populate('conversationId', 'type name participants'),
    Message.countDocuments(filter),
  ]);

  return successResponse(
    res,
    {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    'Message search result',
  );
});

const searchUsers = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const page = Number(req.query.page);
  const limit = Number(req.query.limit);
  const skip = (page - 1) * limit;
  const queryRegex = new RegExp(escapeRegex(q), 'i');

  const filter = {
    deletedAt: null,
    $or: [{ username: queryRegex }, { email: queryRegex }, { phone: queryRegex }],
  };

  const [items, total] = await Promise.all([
    User.find(filter)
      .select('username email phone avatarUrl isOnline lastSeen')
      .sort({ isOnline: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return successResponse(
    res,
    {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    'User search result',
  );
});

module.exports = {
  searchMessages,
  searchUsers,
};
