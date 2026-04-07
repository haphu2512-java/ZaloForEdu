const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const AppError = require("../utils/appError");
const {
  sendVerificationEmail,
  sendResetPasswordEmail,
  sendPasswordChangedEmail,
} = require("../utils/emailService");
const {
  uploadImageBuffer,
  deleteImageByUrl,
} = require("../utils/cloudinaryService");

// ── Helper: Sinh Access Token (ngắn hạn) ──
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// ── Helper: Hash token bằng SHA-256 ──
const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

// ── Helper: Sinh Refresh Token (dài hạn, lưu DB) ──
const generateRefreshToken = async (user, ipAddress) => {
  const token = crypto.randomBytes(40).toString("hex");
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 ngày

  await RefreshToken.create({
    user: user._id,
    token: hashToken(token),
    expires,
    createdByIp: ipAddress,
  });

  return token; // Trả về token chưa hash (gửi cho client)
};

// ══════════════════════════════════════════════════════════════
// ĐĂNG KÝ - (dùng OTP 6 số)
// ══════════════════════════════════════════════════════════════
exports.registerUser = async ({ email, password, fullName }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError("Email đã được đăng ký", 400);
  }

  // Ép cứng quyền sinh viên cho đăng ký
  const user = await User.create({
    email,
    password,
    fullName,
    role: "student",
    isEmailVerified: false,
    isActive: true,
  });

  // Sinh OTP 6 số
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  user.emailVerificationToken = otpCode;
  user.emailVerificationExpire = Date.now() + 10 * 60 * 1000; // 10 phút
  await user.save({ validateBeforeSave: false });

  try {
    await sendVerificationEmail(user.email, user.fullName, otpCode);
  } catch (err) {
    console.error("Failed to send verification email:", err.message);
  }

  return { email: user.email };
};

// ══════════════════════════════════════════════════════════════
// ĐĂNG NHẬP - (Brute-force + RefreshToken + IP audit)
// ══════════════════════════════════════════════════════════════
exports.loginUser = async (email, password, ipAddress) => {
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new AppError("Email hoặc mật khẩu không chính xác", 401);
  }

  //  Khóa tài khoản 15 phút ──
  if (user.lockUntil && user.lockUntil > Date.now()) {
    const minLeft = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
    throw new AppError(
      `Tài khoản đã bị tạm khóa do nhập sai quá nhiều lần. Vui lòng thử lại sau ${minLeft} phút.`,
      403,
      "ACCOUNT_LOCKED",
      { lockUntil: user.lockUntil },
    );
  }

  // Kiểm tra mật khẩu
  const isPasswordMatch = await user.comparePassword(password);

  if (!isPasswordMatch) {
    //  Đếm số lần sai
    user.loginAttempts = (user.loginAttempts || 0) + 1;
    let message = "Email hoặc mật khẩu không chính xác";
    let errorCode = "INVALID_CREDENTIALS";

    if (user.loginAttempts >= 5) {
      user.lockUntil = Date.now() + 15 * 60 * 1000;
      message =
        "Tài khoản đã bị tạm khóa 15 phút do nhập sai mật khẩu quá 5 lần.";
      errorCode = "ACCOUNT_LOCKED_JUST_NOW";
    } else if (user.loginAttempts >= 3) {
      message = `Sai mật khẩu. Bạn còn ${5 - user.loginAttempts} lần thử trước khi bị khóa.`;
    }

    await user.save({ validateBeforeSave: false });
    throw new AppError(message, 401, errorCode, {
      loginAttempts: user.loginAttempts,
    });
  }

  // Kiểm tra tài khoản bị vô hiệu hóa
  if (!user.isActive) {
    throw new AppError(
      "Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ Admin.",
      401,
      "ACCOUNT_INACTIVE",
    );
  }

  // Kiểm tra xác thực email (Admin và Teacher bypass)
  if (
    !user.isEmailVerified &&
    user.role !== "admin" &&
    user.role !== "teacher"
  ) {
    throw new AppError(
      "Tài khoản chưa được xác thực email. Vui lòng xác thực trước khi đăng nhập.",
      403,
      "EMAIL_NOT_VERIFIED",
      { email: user.email },
    );
  }

  // ──  Sinh Access Token + Refresh Token ──
  const accessToken = generateAccessToken(user._id);
  const refreshToken = await generateRefreshToken(user, ipAddress);

  // Reset brute-force counter
  user.lastLogin = new Date();
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  await user.save({ validateBeforeSave: false });

  return {
    user,
    accessToken,
    refreshToken,
  };
};

// ═════════════════════
// ĐĂNG XUẤT - Logout
// ════════════════════════════
exports.logoutUser = async (token, ipAddress) => {
  if (!token) return;

  const refreshToken = await RefreshToken.findOne({ token: hashToken(token) });
  if (!refreshToken) return;

  refreshToken.revoked = new Date();
  refreshToken.revokedByIp = ipAddress;
  await refreshToken.save();
};

// ═══════════════
// LÀM MỚI TOKEN - Refresh (Token Rotation)
// ═════════════════════════
exports.refreshUserToken = async (token, ipAddress) => {
  const refreshToken = await RefreshToken.findOne({
    token: hashToken(token),
  }).populate("user");

  if (!refreshToken || !refreshToken.isActive) {
    throw new AppError("Refresh token không hợp lệ hoặc đã hết hạn", 401);
  }

  const { user } = refreshToken;

  if (!user || !user.isActive) {
    throw new AppError("Tài khoản đã bị vô hiệu hóa", 401);
  }

  // Thu hồi token cũ, cấp token mới
  const newRawToken = await generateRefreshToken(user, ipAddress);

  refreshToken.revoked = new Date();
  refreshToken.revokedByIp = ipAddress;
  refreshToken.replacedByToken = hashToken(newRawToken);
  await refreshToken.save();

  const accessToken = generateAccessToken(user._id);

  return {
    accessToken,
    refreshToken: newRawToken,
  };
};

// ════════════════════════
// XÁC THỰC EMAIL
// ═══════════════════════
exports.verifyUserEmail = async (email, otp) => {
  if (!email || !otp) {
    throw new AppError("Vui lòng cung cấp email và mã OTP", 400);
  }

  const user = await User.findOne({
    email,
    emailVerificationToken: otp,
    emailVerificationExpire: { $gt: Date.now() },
  });

  if (!user) {
    throw new AppError("Mã xác thực không hợp lệ hoặc đã hết hạn", 400);
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateAccessToken(user._id);

  return {
    user: user.getPublicProfile(),
    token,
  };
};

// ══════════════════════════════════════════════════════════════
// GỬI LẠI OTP - Resend Verification
// ══════════════════════════════════════════════════════════════
exports.resendUserVerification = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError("Không tìm thấy tài khoản với email này", 404);
  if (user.isEmailVerified)
    throw new AppError("Tài khoản này đã được xác thực", 400);

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  user.emailVerificationToken = otpCode;
  user.emailVerificationExpire = Date.now() + 10 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  try {
    await sendVerificationEmail(user.email, user.fullName, otpCode);
  } catch (err) {
    throw new AppError(
      "Không thể gửi email lúc này. Vui lòng thử lại sau.",
      500,
    );
  }
};

// ═══════════════
// LẤY THÔNG TIN CÁ NHÂN - Get Me
// ═════════════════════════=
exports.getMeProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError("Không tìm thấy người dùng", 404);
  return user.getPublicProfile();
};

// ═════════════════
// CẬP NHẬT HỒ SƠ - Update Profile
// ════════════════════════
exports.updateProfileData = async (userId, body, avatarFile = null) => {
  const existingUser = await User.findById(userId);
  if (!existingUser) {
    throw new AppError("KhÃ´ng tÃ¬m tháº¥y ngÆ°á»i dÃ¹ng", 404);
  }

  const { fullName, avatar, phoneNumber, dateOfBirth, bio, department } = body;
  const updateData = {
    fullName,
    avatar,
    phoneNumber,
    dateOfBirth,
    bio,
    department,
  };

  // Lọc bỏ các trường undefined
  Object.keys(updateData).forEach(
    (key) => updateData[key] === undefined && delete updateData[key],
  );

  if (avatarFile && avatarFile.buffer) {
    const uploadResult = await uploadImageBuffer(avatarFile.buffer, {
      publicId: `user_${userId}_${Date.now()}`,
    });
    updateData.avatar = uploadResult.secure_url;
  }

  const user = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  });

  if (avatarFile && avatarFile.buffer && existingUser.avatar && user.avatar !== existingUser.avatar) {
    await deleteImageByUrl(existingUser.avatar);
  }

  return user.getPublicProfile();
};

// ════════════════════════════
// ĐỔI MẬT KHẨU - Change Password
// ═══════════════════════════
exports.changeUserPassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select("+password");

  if (!(await user.comparePassword(currentPassword))) {
    throw new AppError("Mật khẩu hiện tại không chính xác", 401);
  }

  user.password = newPassword;
  await user.save();

  return { message: "Đổi mật khẩu thành công" };
};

// ══════════════════════
// QUÊN MẬT KHẨU
//// ═════════
exports.forgotUserPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError("Không tìm thấy tài khoản với email này", 404);
  }

  // Sinh token ngẫu nhiên rồi hash lưu DB
  const rawToken = crypto.randomBytes(20).toString("hex");
  user.resetPasswordToken = hashToken(rawToken);
  user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 giờ
  await user.save({ validateBeforeSave: false });

  try {
    await sendResetPasswordEmail(user.email, user.fullName, rawToken);
    console.log(`✅ Reset password email sent to: ${user.email}`);
  } catch (emailError) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    throw new AppError("Không thể gửi email. Vui lòng thử lại sau.", 500);
  }
};

// ══════════════════════════════════════════════════════════════
// ĐẶT LẠI MẬT KHẨU - Reset Password
// ════════════════════════
exports.resetUserPassword = async (token, newPassword) => {
  const hashedToken = hashToken(token);

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    throw new AppError("Mã khôi phục không hợp lệ hoặc đã hết hạn", 400);
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  try {
    await sendPasswordChangedEmail(user.email, user.fullName);
  } catch (err) {
    console.error("Password changed notification email failed:", err.message);
  }

  return { message: "Đặt lại mật khẩu thành công" };
};
