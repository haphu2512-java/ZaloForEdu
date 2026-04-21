const Conversation = require('../models/Conversation');
const GroupMember = require('../models/GroupMember');
const ApiError = require('../utils/apiError');

const toStr = (id) => id?.toString();

const roleRank = {
  member: 1,
  mod: 2,
  admin: 3,
  owner: 4,
};

const loadCommunityMember = async (req, _res, next) => {
  const communityId = req.params.id || req.params.communityId || req.body.communityId || req.body.groupId;
  if (!communityId) return next(new ApiError(400, 'INVALID_COMMUNITY_ID', 'Community id is required'));

  const community = await Conversation.findById(communityId);
  if (!community || community.type !== 'community') {
    return next(new ApiError(404, 'COMMUNITY_NOT_FOUND', 'Community not found'));
  }

  const member = await GroupMember.findOne({ groupId: communityId, userId: req.user._id });
  if (!member || member.status !== 'active') {
    return next(new ApiError(403, 'FORBIDDEN', 'You are not an active member of this community'));
  }

  req.community = community;
  req.communityMember = member;
  return next();
};

const requireCommunityRoles = (allowedRoles = []) => (req, _res, next) => {
  const role = req.communityMember?.role || 'member';
  const allowed = allowedRoles.some((r) => roleRank[role] >= roleRank[r]);
  if (!allowed) {
    return next(new ApiError(403, 'FORBIDDEN', 'Insufficient role permission'));
  }
  return next();
};

const requireCommunityManageMembers = [loadCommunityMember, requireCommunityRoles(['admin'])];
const requireAnnouncementPublisher = [loadCommunityMember, requireCommunityRoles(['mod'])];

const syncLegacyGroupRole = async ({ conversation, userId }) => {
  const userIdStr = toStr(userId);
  const ownerId = toStr(conversation.ownerId || conversation.createdBy);
  const isAdmin = (conversation.adminIds || []).some((id) => toStr(id) === userIdStr);
  const role = ownerId === userIdStr ? 'owner' : isAdmin ? 'admin' : 'member';

  await GroupMember.findOneAndUpdate(
    { groupId: conversation._id, userId },
    {
      $set: {
        role,
        status: 'active',
        lastActiveAt: new Date(),
      },
    },
    { upsert: true, new: true },
  );
};

module.exports = {
  loadCommunityMember,
  requireCommunityRoles,
  requireCommunityManageMembers,
  requireAnnouncementPublisher,
  syncLegacyGroupRole,
};
