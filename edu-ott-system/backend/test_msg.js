const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Message = require('./models/Message');
  const msgs = await Message.find({ content: { $regex: 'mèo méo meo' } });
  for (let m of msgs) {
    console.log(`Msg: ${m.content}, in Conv: ${m.conversationId}`);
  }
  process.exit(0);
});
