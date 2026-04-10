const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');

const listConversations = asyncHandler(async (req, res) => {
  const page = Number(req.query.page);
  const limit = Number(req.query.limit);
  const skip = (page - 1) * limit;

  const baseFilter = {
    participants: req.user._id,
  };

  const [conversations, total] = await Promise.all([
    Conversation.find(baseFilter)
      .populate('participants', 'username email avatarUrl isOnline lastSeen')
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    Conversation.countDocuments(baseFilter),
  ]);

  if (conversations.length === 0) {
    return successResponse(
      res,
      {
        items: [],
        pagination: {
          page,
          limit,
          total,
          totalPages: 0,
        },
      },
      'Conversations fetched',
    );
  }

  const conversationIds = conversations.map((conversation) => conversation._id);
  
  const latestMessagePromises = conversationIds.map((cid) => 
    Message.findOne({ conversationId: cid, deletedBy: { $ne: req.user._id } })
      .sort({ createdAt: -1, _id: -1 })
      .populate('senderId', 'username avatarUrl')
  );
  
  const latestMessagesArr = await Promise.all(latestMessagePromises);

  const items = conversations.map((conversation, index) => {
    const latest = latestMessagesArr[index];
    return {
      ...conversation.toObject(),
      latestMessage: latest ? latest.toObject() : null,
    };
  });

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
    'Conversations fetched',
  );
});

const createConversation = asyncHandler(async (req, res) => {
  const { type, name, participantIds } = req.body;
  const uniqueParticipants = [...new Set([...participantIds, req.user._id.toString()])];

  if (type === 'direct' && uniqueParticipants.length !== 2) {
    throw new ApiError(400, 'INVALID_PARTICIPANTS', 'Direct conversation must contain exactly 2 participants');
  }

  if (type === 'direct') {
    const existing = await Conversation.findOne({
      type: 'direct',
      participants: { $all: uniqueParticipants, $size: 2 },
    });

    if (existing) {
      return successResponse(res, existing, 'Conversation already exists');
    }
  }

  const conversation = await Conversation.create({
    type,
    name: type === 'group' ? name || 'Group chat' : null,
    participants: uniqueParticipants,
    createdBy: req.user._id,
    lastMessageAt: new Date(),
  });

  return successResponse(res, conversation, 'Conversation created', 201);
});

module.exports = {
  listConversations,
  createConversation,
};
