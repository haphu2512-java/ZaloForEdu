/**
 * Xóa các direct conversation không có tin nhắn nào
 * Chạy: node scripts/cleanEmptyConversations.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) { console.error('❌ Không tìm thấy MONGODB_URI'); process.exit(1); }

  await mongoose.connect(uri);
  console.log('✅ Đã kết nối MongoDB\n');

  const conversations = mongoose.connection.collection('conversations');
  const messages = mongoose.connection.collection('messages');

  // Lấy tất cả direct conversation có đúng 2 participants (không phải self-conv)
  const convs = await conversations.find({
    type: 'direct',
    $expr: { $eq: [{ $size: '$participants' }, 2] }
  }).toArray();

  console.log(`📋 Tìm thấy ${convs.length} direct conversation cần kiểm tra`);

  let deleted = 0;
  for (const conv of convs) {
    const msgCount = await messages.countDocuments({ conversationId: conv._id });
    if (msgCount === 0) {
      await conversations.deleteOne({ _id: conv._id });
      console.log(`🗑️  Xóa conversation rỗng: ${conv._id} (participants: ${conv.participants.join(', ')})`);
      deleted++;
    }
  }

  console.log(`\n✅ Đã xóa ${deleted} conversation rỗng`);
  await mongoose.disconnect();
}

run().catch(err => { console.error('❌ Lỗi:', err); process.exit(1); });
