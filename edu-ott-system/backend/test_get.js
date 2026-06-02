const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./models/User');
  const Conversation = require('./models/Conversation');
  const user = await User.findOne({ username: 'user1' });
  const myId = user._id;

  const baseFilter = {
    $or: [
      { participants: myId },
      { 'pastParticipants.userId': myId }
    ],
  };

  const conversations = await Conversation.find(baseFilter)
    .populate('participants', 'username email avatarUrl isOnline lastSeen messagePrivacy')
    .sort({ lastMessageAt: -1, _id: -1 })
    .limit(50);
  
  for(let c of conversations) {
    if (c.type === 'direct' && c.participants.length === 1 && c.participants[0]._id.toString() === myId.toString()) {
       console.log('Self conversation found:', c._id);
       console.log('Is it hidden or deleted?');
       const ConversationPreference = require('./models/ConversationPreference');
       const prefs = await ConversationPreference.find({ userId: myId, conversationId: c._id });
       console.log('Prefs:', prefs);
    }
  }
  process.exit(0);
});
