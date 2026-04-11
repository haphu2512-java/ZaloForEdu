const mongoose = require('mongoose');
const env = require('./config/env');

mongoose.connect(env.mongoUri).then(async () => {
  const result = await mongoose.connection.db.collection('users').updateMany(
    { phone: null },
    { $unset: { phone: '' } }
  );
  console.log('Updated', result.modifiedCount, 'users with null phone');
  await mongoose.disconnect();
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
