const mongoose = require('mongoose');
const User = require('./models/User');
const FriendRequest = require('./models/FriendRequest');
require('dotenv').config({ path: __dirname + '/.env' });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const users = await User.find({ username: /kieutrang/i });
  console.log("Found kieutrang users:", users.map(u => ({ id: u._id, username: u.username })));
  
  if (users.length > 0) {
    const kId = users[0]._id;
    const reqs = await FriendRequest.find({
      $or: [{ fromUserId: kId }, { toUserId: kId }]
    });
    console.log("Requests involving", users[0].username, ":", reqs);
  }
  process.exit(0);
});
