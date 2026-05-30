const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: __dirname + '/.env' });

const userId = '69db979254382b76003ae112';
const FriendRequest = require('./models/FriendRequest');
const User = require('./models/User'); // Import User model

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const filter = {
    toUserId: userId,
    status: 'pending',
  };
  
  const items = await FriendRequest.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(21)
    .populate('fromUserId', 'username email phone avatarUrl isOnline lastSeen');
    
  console.log("Incoming reqs:", JSON.stringify(items, null, 2));
  process.exit(0);
});
