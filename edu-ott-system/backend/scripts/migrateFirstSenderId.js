/**
 * Migration: backfill firstSenderId cho các direct conversation cũ chưa có
 * Lấy tin nhắn cũ nhất của mỗi conversation để xác định người gửi đầu tiên
 * Chạy: node scripts/migrateFirstSenderId.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ Không tìm thấy MONGODB_URI trong .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✅ Đã kết nối MongoDB');

  const conversations = mongoose.connection.collection('conversations');
  const messages = mongoose.connection.collection('messages');

  // Lấy tất cả direct conversation chưa có firstSenderId
  const convs = await conversations.find({
    type: 'direct',
    firstSenderId: null,
  }).toArray();

  console.log(`📋 Tìm thấy ${convs.length} conversation cần backfill`);

  let updated = 0;
  let skipped = 0;

  for (const conv of convs) {
    // Lấy tin nhắn cũ nhất của conversation này
    const firstMsg = await messages.findOne(
      { conversationId: conv._id },
      { sort: { createdAt: 1 } }
    );

    if (!firstMsg?.senderId) {
      skipped++;
      continue;
    }

    await conversations.updateOne(
      { _id: conv._id },
      { $set: { firstSenderId: firstMsg.senderId } }
    );
    updated++;
  }

  console.log(`✅ Đã cập nhật ${updated} conversation`);
  console.log(`⏭️  Bỏ qua ${skipped} conversation (không có tin nhắn)`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('❌ Lỗi migration:', err);
  process.exit(1);
});
