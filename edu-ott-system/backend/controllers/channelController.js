const Channel = require('../models/Channel');
const Conversation = require('../models/Conversation');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');

const createChannel = asyncHandler(async (req, res) => {
  const { groupId, name, type } = req.body;
  const community = await Conversation.findOne({ _id: groupId, type: 'community' });
  if (!community) throw new ApiError(404, 'COMMUNITY_NOT_FOUND', 'Community not found');

  const channel = await Channel.create({ groupId, name, type });
  return successResponse(res, channel, 'Channel created', 201);
});

const listChannelsByCommunity = asyncHandler(async (req, res) => {
  const { communityId } = req.params;
  const community = await Conversation.findOne({ _id: communityId, type: 'community' });
  if (!community) throw new ApiError(404, 'COMMUNITY_NOT_FOUND', 'Community not found');

  const channels = await Channel.find({ groupId: communityId }).sort({ createdAt: 1 });
  return successResponse(res, channels, 'Channels fetched');
});

module.exports = {
  createChannel,
  listChannelsByCommunity,
};
