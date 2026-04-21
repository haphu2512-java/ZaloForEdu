/**
 * Migration: backfill messagePrivacy = 'everyone' cho tất cả user cũ
 * Chạy: node backend/scripts/migrateMessagePrivacy.js
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

  const result = await mongoose.connection.collection('users').updateMany(
    { messagePrivacy: { $exists: false } },
    { $set: { messagePrivacy: 'everyone' } }
  );

  console.log(`✅ Đã cập nhật ${result.modifiedCount} user (messagePrivacy = 'everyone')`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('❌ Lỗi migration:', err);
  process.exit(1);
});
