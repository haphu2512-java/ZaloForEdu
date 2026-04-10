/* eslint-disable no-console */
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const env = require('../config/env');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Media = require('../models/Media');
const Notification = require('../models/Notification');
const RefreshToken = require('../models/RefreshToken');

const run = async () => {
  const reset = process.argv.includes('--reset');

  if (!env.mongodbUri) {
    throw new Error('MONGODB_URI is missing');
  }

  await mongoose.connect(env.mongodbUri);
  console.log(`[seed] Connected MongoDB: ${mongoose.connection.host}`);

  if (reset) {
    await Promise.all([
      Message.deleteMany({}),
      Conversation.deleteMany({}),
      FriendRequest.deleteMany({}),
      Media.deleteMany({}),
      Notification.deleteMany({}),
      RefreshToken.deleteMany({}),
      User.deleteMany({}),
    ]);
    console.log('[seed] Existing collections cleared');
  } else {
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      console.log('[seed] Database already has data. Use --reset to reseed from scratch.');
      await mongoose.disconnect();
      return;
    }
  }

  const passwordHash = await bcrypt.hash('123456', 10);

  const userDocs = await User.insertMany([
    {
      username: 'alice',
      email: 'alice@example.com',
      phone: '0900000001',
      passwordHash,
      isEmailVerified: true,
      isOnline: true,
      avatarUrl: 'https://i.pravatar.cc/200?img=1',
    },
    {
      username: 'bob',
      email: 'bob@example.com',
      phone: '0900000002',
      passwordHash,
      isEmailVerified: true,
      isOnline: true,
      avatarUrl: 'https://i.pravatar.cc/200?img=2',
    },
    {
      username: 'charlie',
      email: 'charlie@example.com',
      phone: '0900000003',
      passwordHash,
      isEmailVerified: false,
      isOnline: false,
      avatarUrl: 'https://i.pravatar.cc/200?img=3',
    },
    {
      username: 'daisy',
      email: 'daisy@example.com',
      phone: '0900000004',
      passwordHash,
      isEmailVerified: true,
      isOnline: false,
      avatarUrl: 'https://i.pravatar.cc/200?img=4',
    },
    {
      username: 'eric',
      email: 'eric@example.com',
      phone: '0900000005',
      passwordHash,
      isEmailVerified: true,
      isOnline: true,
      avatarUrl: 'https://i.pravatar.cc/200?img=5',
    },
  ]);

  const users = Object.fromEntries(userDocs.map((u) => [u.username, u]));

  // Friendship graph
  await User.updateOne(
    { _id: users.alice._id },
    { $set: { friends: [users.bob._id, users.daisy._id], blockedUsers: [] } },
  );
  await User.updateOne(
    { _id: users.bob._id },
    { $set: { friends: [users.alice._id], blockedUsers: [] } },
  );
  await User.updateOne(
    { _id: users.daisy._id },
    { $set: { friends: [users.alice._id], blockedUsers: [] } },
  );
  await User.updateOne(
    { _id: users.charlie._id },
    { $set: { friends: [], blockedUsers: [] } },
  );
  await User.updateOne(
    { _id: users.eric._id },
    { $set: { friends: [], blockedUsers: [users.charlie._id] } },
  );

  // Friend requests
  const pendingReq = await FriendRequest.create({
    fromUserId: users.eric._id,
    toUserId: users.bob._id,
    status: 'pending',
  });
  await FriendRequest.create({
    fromUserId: users.charlie._id,
    toUserId: users.alice._id,
    status: 'rejected',
    respondedAt: new Date(),
  });
  await FriendRequest.create({
    fromUserId: users.daisy._id,
    toUserId: users.bob._id,
    status: 'accepted',
    respondedAt: new Date(),
  });

  // Media
  const media1 = await Media.create({
    uploaderId: users.alice._id,
    fileName: 'sample-image.jpg',
    mimeType: 'image/jpeg',
    size: 1024 * 120,
    storage: 'cloudinary',
    url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    providerPublicId: 'sample',
    providerResourceType: 'image',
  });
  const media2 = await Media.create({
    uploaderId: users.bob._id,
    fileName: 'report.pdf',
    mimeType: 'application/pdf',
    size: 1024 * 90,
    storage: 'local',
    url: '/uploads/sample-report.pdf',
  });

  // Conversations
  const directAB = await Conversation.create({
    type: 'direct',
    participants: [users.alice._id, users.bob._id],
    createdBy: users.alice._id,
  });
  const directAD = await Conversation.create({
    type: 'direct',
    participants: [users.alice._id, users.daisy._id],
    createdBy: users.daisy._id,
  });
  const group1 = await Conversation.create({
    type: 'group',
    name: 'Team Study',
    participants: [users.alice._id, users.bob._id, users.charlie._id, users.daisy._id],
    createdBy: users.alice._id,
  });

  // Messages
  const m1 = await Message.create({
    conversationId: directAB._id,
    senderId: users.alice._id,
    content: 'Chào Bob, hôm nay học backend nhé.',
    mediaIds: [],
    deliveredTo: [users.alice._id, users.bob._id],
    seenBy: [users.alice._id],
    reactions: [],
  });
  const m2 = await Message.create({
    conversationId: directAB._id,
    senderId: users.bob._id,
    content: 'OK Alice, gửi mình tài liệu luôn.',
    mediaIds: [media2._id],
    deliveredTo: [users.alice._id, users.bob._id],
    seenBy: [users.bob._id],
    replyTo: m1._id,
    reactions: [],
  });
  await Message.create({
    conversationId: group1._id,
    senderId: users.charlie._id,
    content: 'Mình forward tin từ chat riêng.',
    mediaIds: [media1._id],
    forwardFrom: m2._id,
    deliveredTo: [users.alice._id, users.bob._id, users.charlie._id, users.daisy._id],
    seenBy: [users.charlie._id],
    reactions: [{ userId: users.alice._id, emoji: '👍' }],
  });
  await Message.create({
    conversationId: directAD._id,
    senderId: users.daisy._id,
    content: 'Tối nay họp nhóm lúc 8h nhé.',
    mediaIds: [],
    deliveredTo: [users.alice._id, users.daisy._id],
    seenBy: [users.daisy._id],
    reactions: [],
  });

  await Conversation.updateOne({ _id: directAB._id }, { $set: { lastMessageAt: new Date() } });
  await Conversation.updateOne({ _id: directAD._id }, { $set: { lastMessageAt: new Date() } });
  await Conversation.updateOne({ _id: group1._id }, { $set: { lastMessageAt: new Date() } });

  // Notifications
  await Notification.insertMany([
    {
      userId: users.bob._id,
      type: 'friend_request',
      title: 'Lời mời kết bạn mới',
      body: 'Eric đã gửi lời mời kết bạn cho bạn',
      data: { requestId: pendingReq._id.toString(), fromUserId: users.eric._id.toString() },
      isRead: false,
    },
    {
      userId: users.alice._id,
      type: 'system',
      title: 'Chào mừng',
      body: 'Chào mừng bạn đến với ứng dụng chat',
      data: {},
      isRead: true,
      readAt: new Date(),
    },
  ]);

  // Refresh tokens (sample)
  await RefreshToken.insertMany([
    {
      userId: users.alice._id,
      jti: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revokedAt: null,
    },
    {
      userId: users.bob._id,
      jti: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      revokedAt: null,
    },
  ]);

  console.log('[seed] Done.');
  console.log('[seed] Test accounts (password: 123456):');
  console.log('  alice@example.com / 0900000001');
  console.log('  bob@example.com / 0900000002');
  console.log('  charlie@example.com / 0900000003');
  console.log('  daisy@example.com / 0900000004');
  console.log('  eric@example.com / 0900000005');

  await mongoose.disconnect();
  console.log('[seed] MongoDB disconnected');
};

run().catch(async (error) => {
  console.error('[seed] Failed:', error.message);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
