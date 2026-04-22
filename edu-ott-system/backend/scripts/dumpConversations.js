/**
 * Dump conversation data để debug
 * Chạy: node scripts/dumpConversations.js
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
  console.log('✅ Đã kết nối MongoDB\n');

  const convs = await mongoose.connection.collection('conversations').find({ type: 'direct' }).toArray();
  const users = await mongoose.connection.collection('users').find({}).toArray();
  const messages = await mongoose.connection.collection('messages').find({}).sort({ createdAt: 1 }).toArray();

  console.log('=== USERS ===');
  users.forEach(u => {
    console.log(`\n${u._id} | ${u.username || u.email || 'no-name'}`);
    console.log(`  messagePrivacy: ${u.messagePrivacy || 'undefined'}`);
    console.log(`  friends (${(u.friends || []).length}): ${(u.friends || []).map(f => {
      const found = users.find(x => x._id.toString() === f.toString());
      return `${f} (${found?.username || '?'})`;
    }).join(', ') || 'none'}`);
  });

  console.log('\n=== DIRECT CONVERSATIONS ===');
  convs.forEach(c => {
    console.log(`\nConv ${c._id}:`);
    console.log(`  participants: ${c.participants.map(p => p.toString()).join(', ')}`);
    console.log(`  firstSenderId: ${c.firstSenderId || 'null'}`);
    console.log(`  createdBy: ${c.createdBy}`);
    console.log(`  lastMessageAt: ${c.lastMessageAt}`);
    
    const convMsgs = messages.filter(m => m.conversationId.toString() === c._id.toString());
    if (convMsgs.length > 0) {
      console.log(`  messages (${convMsgs.length}):`);
      convMsgs.slice(0, 3).forEach(m => {
        console.log(`    - ${m.senderId} | ${m.content?.substring(0, 30) || '[media]'} | ${m.createdAt}`);
      });
    } else {
      console.log(`  messages: NONE`);
    }
  });

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
