const crypto = require('crypto');

const Conversation = require('../models/Conversation');
const Channel = require('../models/Channel');
const GroupMember = require('../models/GroupMember');
const JoinRequest = require('../models/JoinRequest');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');
const socketService = require('../services/socketService');

const createDefaultChannels = async (communityId) => {
  const defaultChannels = [
    { groupId: communityId, name: 'general', type: 'general' },
    { groupId: communityId, name: 'announcements', type: 'announcements' },
    { groupId: communityId, name: 'media', type: 'media' },
  ];
  await Channel.insertMany(defaultChannels, { ordered: false }).catch(() => null);
};

const createCommunity = asyncHandler(async (req, res) => {
  const { name, participantIds, privacy, joinMode } = req.body;
  const myId = req.user._id.toString();
  const uniqueParticipants = [...new Set([...(participantIds || []), myId])];

  const community = await Conversation.create({
    type: 'community',
    name,
    participants: uniqueParticipants,
    createdBy: req.user._id,
    ownerId: req.user._id,
    adminIds: [req.user._id],
    privacy,
    settings: {
      isApprovalRequired: joinMode === 'approval',
      joinMode,
      canMembersSendMessages: true,
    },
    inviteCode: crypto.randomBytes(6).toString('hex'),
    lastMessageAt: new Date(),
  });

  await createDefaultChannels(community._id);

  await GroupMember.insertMany(
    uniqueParticipants.map((userId) => ({
      groupId: community._id,
      userId,
      role: userId === myId ? 'owner' : 'member',
      status: 'active',
      lastActiveAt: new Date(),
    })),
    { ordered: false },
  ).catch(() => null);

  return successResponse(res, community, 'Community created', 201);
});

const getCommunityById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const community = await Conversation.findOne({ _id: id, type: 'community' })
    .populate('ownerId', 'username avatarUrl')
    .populate('adminIds', 'username avatarUrl');
  if (!community) throw new ApiError(404, 'COMMUNITY_NOT_FOUND', 'Community not found');

  const [channels, members] = await Promise.all([
    Channel.find({ groupId: id }).sort({ createdAt: 1 }),
    GroupMember.find({ groupId: id, status: 'active' }).select('userId role status mutedUntil lastActiveAt'),
  ]);

  return successResponse(
    res,
    {
      ...community.toObject(),
      channels,
      members,
      memberCount: members.length,
    },
    'Community fetched',
  );
});

const joinCommunity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { inviteCode } = req.body;
  const community = await Conversation.findOne({ _id: id, type: 'community' });
  if (!community) throw new ApiError(404, 'COMMUNITY_NOT_FOUND', 'Community not found');

  const existing = await GroupMember.findOne({ groupId: id, userId: req.user._id });
  if (existing?.status === 'active') {
    return successResponse(res, existing, 'Already joined this community');
  }
  if (existing?.status === 'banned') {
    throw new ApiError(403, 'FORBIDDEN', 'You are banned from this community');
  }

  const requiresApproval = community.privacy === 'private' || community.settings?.joinMode === 'approval';
  const canJoinByInvite = community.settings?.joinMode === 'invite';

  if (canJoinByInvite && inviteCode && inviteCode === community.inviteCode) {
    const member = await GroupMember.findOneAndUpdate(
      { groupId: id, userId: req.user._id },
      { $set: { status: 'active', role: 'member', lastActiveAt: new Date() } },
      { upsert: true, new: true },
    );
    await Conversation.findByIdAndUpdate(id, { $addToSet: { participants: req.user._id } });
    socketService.emitToConversation(id, 'member_joined', { communityId: id, userId: req.user._id });
    return successResponse(res, member, 'Joined community successfully');
  }

  if (requiresApproval) {
    await GroupMember.findOneAndUpdate(
      { groupId: id, userId: req.user._id },
      { $set: { status: 'pending', role: 'member' } },
      { upsert: true, new: true },
    );
    await JoinRequest.findOneAndUpdate(
      { conversationId: id, userId: req.user._id },
      { $set: { status: 'pending', processedBy: null, processedAt: null } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return successResponse(res, { status: 'pending' }, 'Join request submitted');
  }

  const member = await GroupMember.findOneAndUpdate(
    { groupId: id, userId: req.user._id },
    { $set: { status: 'active', role: 'member', lastActiveAt: new Date() } },
    { upsert: true, new: true },
  );
  await Conversation.findByIdAndUpdate(id, { $addToSet: { participants: req.user._id } });
  socketService.emitToConversation(id, 'member_joined', { communityId: id, userId: req.user._id });
  return successResponse(res, member, 'Joined community successfully');
});

const approveCommunityJoin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, action } = req.body;

  const status = action === 'approve' ? 'active' : 'banned';
  const member = await GroupMember.findOneAndUpdate(
    { groupId: id, userId, status: 'pending' },
    { $set: { status, lastActiveAt: status === 'active' ? new Date() : null } },
    { new: true },
  );
  if (!member) throw new ApiError(404, 'JOIN_REQUEST_NOT_FOUND', 'Pending member request not found');

  await JoinRequest.findOneAndUpdate(
    { conversationId: id, userId },
    {
      $set: {
        status: action === 'approve' ? 'approved' : 'rejected',
        processedBy: req.user._id,
        processedAt: new Date(),
      },
    },
  );

  if (action === 'approve') {
    await Conversation.findByIdAndUpdate(id, { $addToSet: { participants: userId } });
    socketService.emitToConversation(id, 'member_joined', { communityId: id, userId });
  }

  return successResponse(res, member, `Join request ${action}d`);
});

module.exports = {
  createCommunity,
  getCommunityById,
  joinCommunity,
  approveCommunityJoin,
};
