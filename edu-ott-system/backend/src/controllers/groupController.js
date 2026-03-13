const Group = require('../models/Group');
const Class = require('../models/Class');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all groups (for current user)
// @route   GET /api/v1/groups
// @access  Private
exports.getAllGroups = asyncHandler(async (req, res, next) => {
  const { classId, page = 1, limit = 10 } = req.query;

  const filter = { isActive: true };

  // Filter by class
  if (classId) filter.class = classId;

  // Show only groups the user belongs to (unless admin)
  if (req.user.role !== 'admin') {
    filter['members.user'] = req.user._id;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Group.countDocuments(filter);

  const groups = await Group.find(filter)
    .populate('class', 'name code')
    .populate('createdBy', 'fullName email avatar')
    .populate('members.user', 'fullName email avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  res.status(200).json({
    status: 'success',
    results: groups.length,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit)),
    data: { groups },
  });
});

// @desc    Create new group
// @route   POST /api/v1/groups
// @access  Private
exports.createGroup = asyncHandler(async (req, res, next) => {
  const { name, description, classId, members } = req.body;

  // Verify the class exists
  const classDoc = await Class.findById(classId);
  if (!classDoc) {
    return next(new AppError('Class not found', 404));
  }

  // Create group with creator as leader
  const groupData = {
    name,
    description,
    class: classId,
    createdBy: req.user._id,
    members: [
      { user: req.user._id, role: 'leader' },
    ],
  };

  // Add other members if provided
  if (members && Array.isArray(members)) {
    members.forEach((memberId) => {
      if (memberId.toString() !== req.user._id.toString()) {
        groupData.members.push({ user: memberId, role: 'member' });
      }
    });
  }

  const group = await Group.create(groupData);

  const populatedGroup = await Group.findById(group._id)
    .populate('class', 'name code')
    .populate('createdBy', 'fullName email avatar')
    .populate('members.user', 'fullName email avatar');

  res.status(201).json({
    status: 'success',
    data: { group: populatedGroup },
  });
});

// @desc    Get group by ID
// @route   GET /api/v1/groups/:id
// @access  Private
exports.getGroup = asyncHandler(async (req, res, next) => {
  const group = await Group.findById(req.params.id)
    .populate('class', 'name code subject')
    .populate('createdBy', 'fullName email avatar')
    .populate('members.user', 'fullName email avatar studentId');

  if (!group) {
    return next(new AppError('No group found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { group },
  });
});

// @desc    Update group
// @route   PUT /api/v1/groups/:id
// @access  Private
exports.updateGroup = asyncHandler(async (req, res, next) => {
  const group = await Group.findById(req.params.id);

  if (!group) {
    return next(new AppError('No group found with that ID', 404));
  }

  // Only the creator or admin can update
  if (
    group.createdBy.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    return next(new AppError('You are not authorized to update this group', 403));
  }

  const updatedGroup = await Group.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate('class', 'name code')
    .populate('createdBy', 'fullName email avatar')
    .populate('members.user', 'fullName email avatar');

  res.status(200).json({
    status: 'success',
    data: { group: updatedGroup },
  });
});

// @desc    Delete group
// @route   DELETE /api/v1/groups/:id
// @access  Private
exports.deleteGroup = asyncHandler(async (req, res, next) => {
  const group = await Group.findById(req.params.id);

  if (!group) {
    return next(new AppError('No group found with that ID', 404));
  }

  // Only the creator or admin can delete
  if (
    group.createdBy.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    return next(new AppError('You are not authorized to delete this group', 403));
  }

  await Group.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// @desc    Add member to group
// @route   POST /api/v1/groups/:id/members
// @access  Private
exports.addMember = asyncHandler(async (req, res, next) => {
  const { userId } = req.body;

  const group = await Group.findById(req.params.id);

  if (!group) {
    return next(new AppError('No group found with that ID', 404));
  }

  // Check if already a member
  const isMember = group.members.some(
    (m) => m.user.toString() === userId.toString()
  );
  if (isMember) {
    return next(new AppError('User is already a member of this group', 400));
  }

  // Check max members
  if (group.maxMembers && group.members.length >= group.maxMembers) {
    return next(new AppError('Group is full', 400));
  }

  group.members.push({ user: userId, role: 'member' });
  await group.save();

  const updatedGroup = await Group.findById(req.params.id)
    .populate('members.user', 'fullName email avatar');

  res.status(200).json({
    status: 'success',
    data: { group: updatedGroup },
  });
});

// @desc    Remove member from group
// @route   DELETE /api/v1/groups/:id/members/:userId
// @access  Private
exports.removeMember = asyncHandler(async (req, res, next) => {
  const group = await Group.findById(req.params.id);

  if (!group) {
    return next(new AppError('No group found with that ID', 404));
  }

  // Only the creator or admin can remove members
  if (
    group.createdBy.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    return next(new AppError('You are not authorized to remove members', 403));
  }

  group.members = group.members.filter(
    (m) => m.user.toString() !== req.params.userId
  );
  await group.save();

  res.status(200).json({
    status: 'success',
    message: 'Member removed successfully',
  });
});
