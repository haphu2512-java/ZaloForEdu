const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');

const sendFriendRequest = asyncHandler(async (req, res) => {
  const fromUserId = req.user._id;
  const { toUserId } = req.body;

  if (fromUserId.equals(toUserId)) {
    throw new ApiError(400, 'INVALID_ACTION', 'Cannot send friend request to yourself');
  }

  const [fromUser, toUser] = await Promise.all([User.findById(fromUserId), User.findById(toUserId)]);
  if (!toUser || toUser.deletedAt) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'Target user not found');
  }

  const isFriend = fromUser.friends.some((friendId) => friendId.equals(toUserId));
  if (isFriend) {
    throw new ApiError(400, 'ALREADY_FRIENDS', 'You are already friends');
  }

  if (toUser.blockedUsers.some((id) => id.equals(fromUserId))) {
    throw new ApiError(403, 'FORBIDDEN', 'You cannot send request to this user');
  }

  const request = await FriendRequest.findOneAndUpdate(
    { fromUserId, toUserId },
    { status: 'pending', respondedAt: null },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return successResponse(res, request, 'Friend request sent', 201);
});

const acceptFriendRequest = asyncHandler(async (req, res) => {
  const request = await FriendRequest.findById(req.params.id);
  if (!request || request.status !== 'pending') {
    throw new ApiError(404, 'REQUEST_NOT_FOUND', 'Friend request not found');
  }

  if (!request.toUserId.equals(req.user._id)) {
    throw new ApiError(403, 'FORBIDDEN', 'You are not allowed to accept this request');
  }

  request.status = 'accepted';
  request.respondedAt = new Date();
  await request.save();

  await Promise.all([
    User.findByIdAndUpdate(request.fromUserId, { $addToSet: { friends: request.toUserId } }),
    User.findByIdAndUpdate(request.toUserId, { $addToSet: { friends: request.fromUserId } }),
  ]);

  return successResponse(res, request, 'Friend request accepted');
});

const rejectFriendRequest = asyncHandler(async (req, res) => {
  const request = await FriendRequest.findById(req.params.id);
  if (!request || request.status !== 'pending') {
    throw new ApiError(404, 'REQUEST_NOT_FOUND', 'Friend request not found');
  }

  if (!request.toUserId.equals(req.user._id)) {
    throw new ApiError(403, 'FORBIDDEN', 'You are not allowed to reject this request');
  }

  request.status = 'rejected';
  request.respondedAt = new Date();
  await request.save();

  return successResponse(res, request, 'Friend request rejected');
});

const removeFriend = asyncHandler(async (req, res) => {
  const friendId = req.params.friendId;

  await Promise.all([
    User.findByIdAndUpdate(req.user._id, { $pull: { friends: friendId } }),
    User.findByIdAndUpdate(friendId, { $pull: { friends: req.user._id } }),
  ]);

  return successResponse(res, {}, 'Friend removed');
});

const getFriendList = asyncHandler(async (req, res) => {
  const page = Number(req.query.page);
  const limit = Number(req.query.limit);

  const user = await User.findById(req.user._id).select('friends');
  const total = user?.friends?.length || 0;
  const skip = (page - 1) * limit;

  const paginatedFriendIds = user.friends.slice(skip, skip + limit);
  const friends = await User.find({
    _id: { $in: paginatedFriendIds },
    deletedAt: null,
  }).select('username email phone avatarUrl isOnline lastSeen');

  const orderMap = new Map(paginatedFriendIds.map((id, index) => [id.toString(), index]));
  friends.sort((a, b) => orderMap.get(a._id.toString()) - orderMap.get(b._id.toString()));

  return successResponse(
    res,
    {
      items: friends,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    'Friend list fetched',
  );
});

const getIncomingFriendRequests = asyncHandler(async (req, res) => {
  const page = Number(req.query.page);
  const limit = Number(req.query.limit);
  const skip = (page - 1) * limit;

  const filter = {
    toUserId: req.user._id,
    status: 'pending',
  };

  const [items, total] = await Promise.all([
    FriendRequest.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate('fromUserId', 'username email phone avatarUrl isOnline lastSeen'),
    FriendRequest.countDocuments(filter),
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
    'Incoming friend requests fetched',
  );
});

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  getFriendList,
  getIncomingFriendRequests,
};
