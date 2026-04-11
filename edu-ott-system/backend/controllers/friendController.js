const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');
const { encodeCursor, decodeCursor } = require('../utils/cursor');

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
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const { cursor } = req.query;

  const user = await User.findById(req.user._id).select('friends');
  const friendIds = user?.friends || [];

  // Parse cursor to get starting position
  let startIndex = 0;
  if (cursor) {
    const parsed = decodeCursor(cursor);
    if (!parsed) {
      throw new ApiError(400, 'INVALID_CURSOR', 'Cursor is invalid');
    }
    // Find the index of the friend after the cursor
    startIndex = friendIds.findIndex(id => id.toString() === parsed.id) + 1;
  }

  // Get items for this page (fetch one extra to check if more exist)
  const paginatedFriendIds = friendIds.slice(startIndex, startIndex + limit + 1);
  const friends = await User.find({
    _id: { $in: paginatedFriendIds },
    deletedAt: null,
  }).select('username email phone avatarUrl isOnline lastSeen');

  // Sort to maintain original friend list order
  const orderMap = new Map(paginatedFriendIds.map((id, index) => [id.toString(), index]));
  friends.sort((a, b) => orderMap.get(a._id.toString()) - orderMap.get(b._id.toString()));

  let nextCursor = null;
  let finalItems = friends;

  if (friends.length > limit) {
    const nextItem = friends[limit - 1];
    nextCursor = encodeCursor({
      createdAt: new Date().toISOString(),
      id: nextItem._id.toString(),
    });
    finalItems = friends.slice(0, limit);
  }

  return successResponse(
    res,
    {
      items: finalItems,
      nextCursor,
      limit,
    },
    'Friend list fetched',
  );
});

const getIncomingFriendRequests = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const { cursor } = req.query;

  const filter = {
    toUserId: req.user._id,
    status: 'pending',
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

  const items = await FriendRequest.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .populate('fromUserId', 'username email phone avatarUrl isOnline lastSeen');

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
