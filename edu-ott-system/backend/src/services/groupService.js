const Group = require('../models/Group');
const Class = require('../models/Class');
const AppError = require('../utils/appError');
const { parsePagination } = require('../utils/pagination');

const canManageGroup = (group, currentUser) => {
  if (currentUser.role === 'admin') return true;
  if (group.createdBy.toString() === currentUser._id.toString()) return true;

  const leaderMember = group.members.find(
    (m) => m.user && m.user.toString() === currentUser._id.toString()
  );
  return Boolean(leaderMember && leaderMember.role === 'leader');
};

exports.getAllGroups = async (query, user) => {
  const { classId, page = 1, limit = 10 } = query;

  const filter = { isActive: true };

  // Filter by class
  if (classId) filter.class = classId;

  // Show only groups the user belongs to (unless admin)
  if (user.role !== 'admin') {
    filter['members.user'] = user._id;
  }

  const { page: currentPage, limit: currentLimit, skip } = parsePagination(page, limit, {
    page: 1,
    limit: 10,
  });
  const total = await Group.countDocuments(filter);

  const groups = await Group.find(filter)
    .populate('class', 'name code')
    .populate('createdBy', 'fullName email avatar')
    .populate('members.user', 'fullName email avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(currentLimit);

  return {
    groups,
    total,
    page: currentPage,
    totalPages: Math.ceil(total / currentLimit),
  };
};

exports.createGroup = async (data, currentUser) => {
  const { name, description, classId, members } = data;
  const userId = currentUser._id;

  // Verify the class exists
  const classDoc = await Class.findById(classId);
  if (!classDoc) {
    throw new AppError('Class not found', 404);
  }

  const isClassTeacher = classDoc.teacher.toString() === userId.toString();
  const isClassStudent = classDoc.students.some((id) => id.toString() === userId.toString());
  if (currentUser.role !== 'admin' && !isClassTeacher && !isClassStudent) {
    throw new AppError('You are not a member of this class', 403);
  }

  // Create group with creator as leader
  const groupData = {
    name,
    description,
    class: classId,
    createdBy: userId,
    members: [{ user: userId, role: 'leader' }],
  };

  // Add other members if provided
  if (members && Array.isArray(members)) {
    members.forEach((memberId) => {
      if (memberId.toString() !== userId.toString()) {
        groupData.members.push({ user: memberId, role: 'member' });
      }
    });
  }

  const group = await Group.create(groupData);

  const populatedGroup = await Group.findById(group._id)
    .populate('class', 'name code')
    .populate('createdBy', 'fullName email avatar')
    .populate('members.user', 'fullName email avatar');

  return populatedGroup;
};

exports.getGroupById = async (groupId, currentUser) => {
  const group = await Group.findById(groupId)
    .populate('class', 'name code subject')
    .populate('createdBy', 'fullName email avatar')
    .populate('members.user', 'fullName email avatar studentId');

  if (!group) {
    throw new AppError('No group found with that ID', 404);
  }

  if (currentUser.role !== 'admin') {
    const isMember = group.members.some(
      (m) => m.user && m.user._id.toString() === currentUser._id.toString()
    );
    if (!isMember) {
      throw new AppError('You are not authorized to access this group', 403);
    }
  }

  return group;
};

exports.updateGroup = async (groupId, data, user) => {
  const group = await Group.findById(groupId);

  if (!group) {
    throw new AppError('No group found with that ID', 404);
  }

  // Only the creator or admin can update
  if (
    group.createdBy.toString() !== user._id.toString() &&
    user.role !== 'admin'
  ) {
    throw new AppError('You are not authorized to update this group', 403);
  }

  const updatedGroup = await Group.findByIdAndUpdate(groupId, data, {
    new: true,
    runValidators: true,
  })
    .populate('class', 'name code')
    .populate('createdBy', 'fullName email avatar')
    .populate('members.user', 'fullName email avatar');

  return updatedGroup;
};

exports.deleteGroup = async (groupId, user) => {
  const group = await Group.findById(groupId);

  if (!group) {
    throw new AppError('No group found with that ID', 404);
  }

  // Only the creator or admin can delete
  if (
    group.createdBy.toString() !== user._id.toString() &&
    user.role !== 'admin'
  ) {
    throw new AppError('You are not authorized to delete this group', 403);
  }

  await Group.findByIdAndDelete(groupId);
};

exports.addMember = async (groupId, userId, currentUser) => {
  if (!userId) {
    throw new AppError('User ID is required', 400);
  }

  const group = await Group.findById(groupId);

  if (!group) {
    throw new AppError('No group found with that ID', 404);
  }

  if (!canManageGroup(group, currentUser)) {
    throw new AppError('You are not authorized to add members', 403);
  }

  const classDoc = await Class.findById(group.class).select('teacher students');
  if (!classDoc) {
    throw new AppError('Class not found', 404);
  }

  const belongsToClass =
    classDoc.teacher.toString() === userId.toString() ||
    classDoc.students.some((id) => id.toString() === userId.toString());
  if (!belongsToClass) {
    throw new AppError('User is not a member of this class', 400);
  }

  // Check if already a member
  const isMember = group.members.some(
    (m) => m.user.toString() === userId.toString()
  );
  if (isMember) {
    throw new AppError('User is already a member of this group', 400);
  }

  // Check max members
  if (group.maxMembers && group.members.length >= group.maxMembers) {
    throw new AppError('Group is full', 400);
  }

  group.members.push({ user: userId, role: 'member' });
  await group.save();

  const updatedGroup = await Group.findById(groupId)
    .populate('members.user', 'fullName email avatar');

  return updatedGroup;
};

exports.removeMember = async (groupId, targetUserId, currentUser) => {
  if (!targetUserId) {
    throw new AppError('Target user ID is required', 400);
  }

  const group = await Group.findById(groupId);

  if (!group) {
    throw new AppError('No group found with that ID', 404);
  }

  if (!canManageGroup(group, currentUser)) {
    throw new AppError('You are not authorized to remove members', 403);
  }

  const leaderMember = group.members.find((m) => m.role === 'leader');
  if (leaderMember && leaderMember.user.toString() === targetUserId.toString()) {
    throw new AppError('Cannot remove group leader', 400);
  }

  group.members = group.members.filter(
    (m) => m.user.toString() !== targetUserId.toString()
  );
  await group.save();
};
