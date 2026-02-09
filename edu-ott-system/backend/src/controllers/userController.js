const User = require('../models/User'); //
const AppError = require('../utils/appError'); //
const asyncHandler = require('../utils/asyncHandler'); //

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private (Admin)
exports.getAllUsers = asyncHandler(async (req, res, next) => {
    console.log("1. Đã vào được Controller getAllUsers!"); //
    const users = await User.find().select('-password');

    console.log("2. Đã lấy xong dữ liệu từ DB:", users);

    res.status(200).json({
        status: 'success',
        results: users.length,
        data: {
            users,
        },
    });
});

// @desc    Get user by ID
// @route   GET /api/v1/users/:id
// @access  Private (Admin)
exports.getUser = asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
        return next(new AppError('No user found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            user,
        },
    });
});

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private (Admin)
exports.updateUser = asyncHandler(async (req, res, next) => {
    // 1. Lọc body để tránh cập nhật password ở đây (password nên có route riêng)
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
        new: true, // Trả về data mới sau khi update
        runValidators: true, // Chạy validate theo Model User
    }).select('-password');

    if (!updatedUser) {
        return next(new AppError('No user found with that ID', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser,
        },
    });
});

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private (Admin)
exports.deleteUser = asyncHandler(async (req, res, next) => {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
        return next(new AppError('No user found with that ID', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null,
    });
});