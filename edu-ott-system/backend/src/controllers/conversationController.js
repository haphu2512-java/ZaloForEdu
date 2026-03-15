const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Class = require('../models/Class');
const Group = require('../models/Group');

/**
 * Get all conversations (Private, Class, Group) for current user
 */
exports.getAllConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Fetch Private Conversations
    const privateConversations = await Conversation.find({
      participants: userId,
    })
      .populate('participants', 'fullName avatar email')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    const formattedPrivate = privateConversations.map((conv) => {
      const otherUser = conv.participants.find(
        (p) => p._id.toString() !== userId.toString()
      );
      return {
        id: conv._id,
        _id: conv._id,
        name: otherUser ? otherUser.fullName : 'Hệ thống',
        avatar: otherUser ? otherUser.avatar : null,
        lastMessage: conv.lastMessage ? conv.lastMessage.content : '',
        time: conv.updatedAt,
        unreadCount: conv.unreadCount ? conv.unreadCount.get(userId.toString()) || 0 : 0,
        roomModel: 'Conversation',
      };
    });

    // 2. Fetch Classes
    const classes = await Class.find({
      $or: [{ teacher: userId }, { students: userId }],
    })
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    const formattedClasses = classes.map((c) => ({
      id: c._id,
      _id: c._id,
      name: `Lớp ${c.name}`,
      avatar: c.coverImage,
      lastMessage: c.lastMessage ? c.lastMessage.content : 'Chưa có tin nhắn',
      time: c.updatedAt,
      unreadCount: 0, // Should implement unread logic for classes later
      roomModel: 'Class',
    }));

    // 3. Fetch Groups
    const groups = await Group.find({
      'members.user': userId,
    })
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    const formattedGroups = groups.map((g) => ({
      id: g._id,
      _id: g._id,
      name: g.name,
      avatar: g.avatar,
      lastMessage: g.lastMessage ? g.lastMessage.content : 'Chưa có tin nhắn',
      time: g.updatedAt,
      unreadCount: 0,
      roomModel: 'Group',
    }));

    // Combine and sort by time
    const allConversations = [
      ...formattedPrivate,
      ...formattedClasses,
      ...formattedGroups,
    ].sort((a, b) => new Date(b.time) - new Date(a.time));

    res.status(200).json({
      status: 'success',
      data: {
        conversations: allConversations,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};

/**
 * Get or Create a conversation with another user
 */
exports.getOrCreateConversation = async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user._id;

    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: 'Recipient userId is required',
      });
    }

    // Find existing conversation between these two users
    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, userId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [currentUserId, userId],
      });
      
      await conversation.populate('participants', 'fullName avatar email');
    }

    res.status(200).json({
      status: 'success',
      data: {
        conversation,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
};
