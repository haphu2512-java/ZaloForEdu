const Class = require('../models/Class');
const Group = require('../models/Group');
const Message = require('../models/Message');
const User = require('../models/User');
const File = require('../models/File');
const AppError = require('../utils/appError');

exports.getDashboard = async (user) => {
  const userId = user._id;
  const userRole = user.role;

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
    const myClassIds = await Class.find({ teacher: userId }).distinct('_id');
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
            $in: myClassIds,
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

  return data;
};

exports.getClassAnalytics = async (classId) => {
  const classDoc = await Class.findById(classId);

  if (!classDoc) {
    throw new AppError('No class found with that ID', 404);
  }

  // Total messages in class
  const totalMessages = await Message.countDocuments({
    room: classDoc._id,
    roomModel: 'Class',
    isDeleted: false,
  });

  // Total files in class
  const totalFiles = await File.countDocuments({
    room: classDoc._id,
    roomModel: 'Class',
    isDeleted: false,
  });

  // Groups in class
  const totalGroups = await Group.countDocuments({
    class: classDoc._id,
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

  return {
    className: classDoc.name,
    classCode: classDoc.code,
    totalStudents: classDoc.students.length,
    totalMessages,
    totalFiles,
    totalGroups,
    messagesByType,
    activeMembers,
    dailyActivity,
  };
};

exports.getUserAnalytics = async (userId) => {
  const user = await User.findById(userId).select('-password');

  if (!user) {
    throw new AppError('No user found with that ID', 404);
  }

  // Classes the user is in
  let classCount;
  if (user.role === 'teacher') {
    classCount = await Class.countDocuments({ teacher: user._id });
  } else {
    classCount = await Class.countDocuments({ students: user._id });
  }

  // Groups the user is in
  const groupCount = await Group.countDocuments({
    'members.user': user._id,
    isActive: true,
  });

  // Total messages sent
  const messageCount = await Message.countDocuments({
    sender: user._id,
    isDeleted: false,
  });

  // Total files uploaded
  const fileCount = await File.countDocuments({
    uploadedBy: user._id,
    isDeleted: false,
  });

  // Messages by type
  const messagesByType = await Message.aggregate([
    { $match: { sender: user._id, isDeleted: false } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);

  // Daily activity (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const dailyActivity = await Message.aggregate([
    {
      $match: {
        sender: user._id,
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

  return {
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
  };
};
