const Class = require('../models/Class');
const Group = require('../models/Group');
const Message = require('../models/Message');
const User = require('../models/User');
const File = require('../models/File');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get dashboard analytics
// @route   GET /api/v1/analytics/dashboard
// @access  Private
exports.getDashboard = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const userRole = req.user.role;

  let data = {};

  if (userRole === 'admin') {
    // Admin sees everything
    const [totalUsers, totalClasses, totalGroups, totalMessages, totalFiles] =
      await Promise.all([
        User.countDocuments({ isActive: true }),
        Class.countDocuments(),
        Group.countDocuments({ isActive: true }),
        Message.countDocuments({ isDeleted: false }),
        File.countDocuments({ isDeleted: false }),
      ]);

    // Users by role
    const usersByRole = await User.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    // Classes by status
    const classesByStatus = await Class.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Recent activity - last 7 days message count per day
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const messageActivity = await Message.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    data = {
      totalUsers,
      totalClasses,
      totalGroups,
      totalMessages,
      totalFiles,
      usersByRole,
      classesByStatus,
      messageActivity,
    };
  } else if (userRole === 'teacher') {
    // Teacher sees their own classes
    const [myClasses, totalStudents, totalGroups, totalMessages] =
      await Promise.all([
        Class.countDocuments({ teacher: userId }),
        Class.aggregate([
          { $match: { teacher: userId } },
          { $project: { studentCount: { $size: '$students' } } },
          { $group: { _id: null, total: { $sum: '$studentCount' } } },
        ]),
        Group.countDocuments({
          class: {
            $in: await Class.find({ teacher: userId }).distinct('_id'),
          },
        }),
        Message.countDocuments({
          sender: userId,
          isDeleted: false,
        }),
      ]);

    data = {
      myClasses,
      totalStudents: totalStudents[0]?.total || 0,
      totalGroups,
      totalMessages,
    };
  } else {
    // Student sees their own info
    const [myClasses, myGroups, myMessages] = await Promise.all([
      Class.countDocuments({ students: userId }),
      Group.countDocuments({ 'members.user': userId, isActive: true }),
      Message.countDocuments({ sender: userId, isDeleted: false }),
    ]);

    data = {
      myClasses,
      myGroups,
      myMessages,
    };
  }

  res.status(200).json({
    status: 'success',
    data,
  });
});

// @desc    Get class analytics
// @route   GET /api/v1/analytics/classes/:id
// @access  Private
exports.getClassAnalytics = asyncHandler(async (req, res, next) => {
  const classDoc = await Class.findById(req.params.id);

  if (!classDoc) {
    return next(new AppError('No class found with that ID', 404));
  }

  const classId = classDoc._id;

  // Total messages in class
  const totalMessages = await Message.countDocuments({
    room: classId,
    roomModel: 'Class',
    isDeleted: false,
  });

  // Total files in class
  const totalFiles = await File.countDocuments({
    room: classId,
    roomModel: 'Class',
    isDeleted: false,
  });

  // Groups in class
  const totalGroups = await Group.countDocuments({
    class: classId,
    isActive: true,
  });

  // Messages by type
  const messagesByType = await Message.aggregate([
    {
      $match: {
        room: classDoc._id,
        roomModel: 'Class',
        isDeleted: false,
      },
    },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);

  // Most active members (by message count)
  const activeMembers = await Message.aggregate([
    {
      $match: {
        room: classDoc._id,
        roomModel: 'Class',
        isDeleted: false,
      },
    },
    { $group: { _id: '$sender', messageCount: { $sum: 1 } } },
    { $sort: { messageCount: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        'user.fullName': 1,
        'user.email': 1,
        'user.avatar': 1,
        messageCount: 1,
      },
    },
  ]);

  // Daily message activity (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const dailyActivity = await Message.aggregate([
    {
      $match: {
        room: classDoc._id,
        roomModel: 'Class',
        createdAt: { $gte: thirtyDaysAgo },
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      className: classDoc.name,
      classCode: classDoc.code,
      totalStudents: classDoc.students.length,
      totalMessages,
      totalFiles,
      totalGroups,
      messagesByType,
      activeMembers,
      dailyActivity,
    },
  });
});

// @desc    Get user analytics
// @route   GET /api/v1/analytics/users/:id
// @access  Private (Admin/Teacher)
exports.getUserAnalytics = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    return next(new AppError('No user found with that ID', 404));
  }

  const userId = user._id;

  // Classes the user is in
  let classCount;
  if (user.role === 'teacher') {
    classCount = await Class.countDocuments({ teacher: userId });
  } else {
    classCount = await Class.countDocuments({ students: userId });
  }

  // Groups the user is in
  const groupCount = await Group.countDocuments({
    'members.user': userId,
    isActive: true,
  });

  // Total messages sent
  const messageCount = await Message.countDocuments({
    sender: userId,
    isDeleted: false,
  });

  // Total files uploaded
  const fileCount = await File.countDocuments({
    uploadedBy: userId,
    isDeleted: false,
  });

  // Messages by type
  const messagesByType = await Message.aggregate([
    { $match: { sender: userId, isDeleted: false } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);

  // Daily activity (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const dailyActivity = await Message.aggregate([
    {
      $match: {
        sender: userId,
        createdAt: { $gte: thirtyDaysAgo },
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      user: {
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
      classCount,
      groupCount,
      messageCount,
      fileCount,
      messagesByType,
      dailyActivity,
    },
  });
});
