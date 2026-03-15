const User = require('../models/User');
const AppError = require('../utils/appError');

exports.getAllUsers = async () => {
  const users = await User.find().select('-password');
  return users;
};

exports.getUserById = async (userId) => {
  const user = await User.findById(userId).select('-password');

  if (!user) {
    throw new AppError('No user found with that ID', 404);
  }

  return user;
};

exports.updateUser = async (userId, updateData) => {
  // Prevent password update through this method
  delete updateData.password;

  const user = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  }).select('-password');

  if (!user) {
    throw new AppError('No user found with that ID', 404);
  }

  return user;
};

exports.deleteUser = async (userId) => {
  const user = await User.findByIdAndDelete(userId);

  if (!user) {
    throw new AppError('No user found with that ID', 404);
  }
};
