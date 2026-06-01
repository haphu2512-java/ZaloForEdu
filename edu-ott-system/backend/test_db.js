const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./models/User');
  const Conversation = require('./models/Conversation');
  const user = await User.findOne({ username: 'user1' });
  const convs = await Conversation.find({ participants: user._id });
  console.log('Conversations count:', convs.length);
  for (let c of convs) {
    console.log(`- ID: ${c._id}, type: ${c.type}, name: ${c.name}, participants: ${c.participants.join(', ')}`);
  }
  process.exit(0);
});
