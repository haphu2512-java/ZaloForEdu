const groupService = require('../services/groupService');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all groups (for current user)
// @route   GET /api/v1/groups
// @access  Private
exports.getAllGroups = asyncHandler(async (req, res, next) => {
  const result = await groupService.getAllGroups(req.query, req.user);

  res.status(200).json({
    status: 'success',
    results: result.groups.length,
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
    data: { groups: result.groups },
  });
});

// @desc    Create new group
// @route   POST /api/v1/groups
// @access  Private
exports.createGroup = asyncHandler(async (req, res, next) => {
  const group = await groupService.createGroup(req.body, req.user._id);

  res.status(201).json({
    status: 'success',
    data: { group },
  });
});

// @desc    Get group by ID
// @route   GET /api/v1/groups/:id
// @access  Private
exports.getGroup = asyncHandler(async (req, res, next) => {
  const group = await groupService.getGroupById(req.params.id);

  res.status(200).json({
    status: 'success',
    data: { group },
  });
});

// @desc    Update group
// @route   PUT /api/v1/groups/:id
// @access  Private
exports.updateGroup = asyncHandler(async (req, res, next) => {
  const group = await groupService.updateGroup(req.params.id, req.body, req.user);

  res.status(200).json({
    status: 'success',
    data: { group },
  });
});

// @desc    Delete group
// @route   DELETE /api/v1/groups/:id
// @access  Private
exports.deleteGroup = asyncHandler(async (req, res, next) => {
  await groupService.deleteGroup(req.params.id, req.user);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// @desc    Add member to group
// @route   POST /api/v1/groups/:id/members
// @access  Private
exports.addMember = asyncHandler(async (req, res, next) => {
  const group = await groupService.addMember(req.params.id, req.body.userId);

  res.status(200).json({
    status: 'success',
    data: { group },
  });
});

// @desc    Remove member from group
// @route   DELETE /api/v1/groups/:id/members/:userId
// @access  Private
exports.removeMember = asyncHandler(async (req, res, next) => {
  await groupService.removeMember(req.params.id, req.params.userId, req.user);

  res.status(200).json({
    status: 'success',
    message: 'Member removed successfully',
  });
});
