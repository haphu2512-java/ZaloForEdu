const nodemailer = require('nodemailer');

/**
 * Tạo transporter cho Nodemailer
 * Hỗ trợ Gmail App Password
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true cho port 465, false cho port 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD, // App Password từ Google
    },
  });
};

/**
 * Gửi email đặt lại mật khẩu
 * @param {string} to - Email người nhận
 * @param {string} fullName - Tên người dùng
 * @param {string} resetToken - Token đặt lại mật khẩu
 */
const sendResetPasswordEmail = async (to, fullName, resetToken) => {
  const transporter = createTransporter();

  const webUrl = process.env.WEB_URL || 'http://localhost:3000';
  const resetUrl = `${webUrl}/reset-password/${resetToken}`;

  const mailOptions = {
    from: `"Zalo Edu" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to,
    subject: 'Yêu cầu đặt lại mật khẩu - Zalo Edu 🔐',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background-color:#E8ECF1;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.06);">
          
          <!-- Banner -->
          <tr>
            <td style="background-color:#0068ff;padding:40px 0;text-align:center;">
              <!-- Modern Logo Placeholder -->
              <div style="width:64px;height:64px;background:#ffffff;border-radius:18px;margin:0 auto 16px;display:table;box-shadow:0 6px 16px rgba(0,0,0,0.15);">
                <div style="display:table-cell;vertical-align:middle;text-align:center;font-size:32px;color:#0068ff;font-weight:bold;line-height:1;">
                  Z
                </div>
              </div>
              <h1 style="color:#ffffff;font-size:26px;font-weight:700;margin:0;letter-spacing:-0.5px;">Zalo Edu</h1>
              <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:6px 0 0;font-weight:500;">Hệ sinh thái Giáo dục Toàn diện</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding:48px 40px 32px;">
              <p style="color:#111827;font-size:18px;font-weight:600;margin:0 0 16px;">Xin chào ${fullName},</p>
              
              <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 12px;">Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản Zalo Edu của bạn. Bạn có thể thiết lập mật khẩu mới bằng cách nhấp vào nút dưới đây:</p>
              
              <!-- Action Button -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:36px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display:inline-block;background-color:#0068ff;color:#ffffff;text-decoration:none;padding:16px 42px;border-radius:12px;font-size:16px;font-weight:600;box-shadow:0 6px 20px rgba(0, 104, 255, 0.3);border:1px solid #0050cd;transition:all 0.3s ease;">Thiết lập mật khẩu mới</a>
                  </td>
                </tr>
              </table>

              <!-- Expiry Alert -->
              <div style="background-color:#F5F8FF;border-left:4px solid #0068ff;padding:16px 20px;border-radius:4px 8px 8px 4px;">
                <p style="color:#1f2937;font-size:14px;margin:0;line-height:1.5;">
                  <span style="color:#0068ff;font-weight:600;">Lưu ý:</span> Liên kết này chỉ có hiệu lực trong vòng <strong>60 phút</strong>. Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email và tài khoản của bạn sẽ được giữ an toàn.
                </p>
              </div>

              <!-- Manual Link -->
              <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:32px 0 0;border-top:1px solid #e5e7eb;padding-top:24px;">
                Hoặc bạn có thể sao chép và dán liên kết sau vào trình duyệt:<br>
                <a href="${resetUrl}" style="color:#0068ff;word-break:break-all;text-decoration:none;font-weight:500;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color:#F8FAFC;padding:32px 40px;text-align:center;">
              <p style="color:#64748b;font-size:12px;line-height:1.6;margin:0;">
                <strong>Zalo Edu - Nền tảng Giáo dục Đa phương tiện</strong><br>
                © ${new Date().getFullYear()} Zalo Group & Đại học Công nghiệp TPHCM.<br>
                Email này được tạo tự động, vui lòng không trả lời.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Gửi email xác nhận đổi mật khẩu thành công
 */
const sendPasswordChangedEmail = async (to, fullName) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Zalo Edu" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to,
    subject: 'Mật khẩu đã được thay đổi thành công ✅',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background-color:#E8ECF1;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.06);">
          
          <!-- Banner -->
          <tr>
            <td style="background-color:#10b981;padding:40px 0;text-align:center;">
              <div style="width:64px;height:64px;background:#ffffff;border-radius:50%;margin:0 auto 16px;display:table;box-shadow:0 6px 16px rgba(16, 185, 129, 0.2);">
                <div style="display:table-cell;vertical-align:middle;text-align:center;font-size:32px;color:#10b981;font-weight:bold;line-height:1;">
                  ✓
                </div>
              </div>
              <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0;letter-spacing:-0.4px;">Bảo mật tài khoản cập nhật</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding:48px 40px 32px;">
              <p style="color:#111827;font-size:18px;font-weight:600;margin:0 0 16px;">Xin chào ${fullName},</p>
              
              <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Mật khẩu cho tài khoản Zalo Edu của bạn đã được thay đổi thành công vào lúc <strong>${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</strong>.
              </p>
              
              <div style="background-color:#FEF2F2;border:1px solid #FCA5A5;padding:18px 24px;border-radius:12px;margin:0 0 24px;">
                <p style="color:#B91C1C;font-size:14px;margin:0;line-height:1.5;">
                  <strong>⚠️ Lưu ý quan trọng:</strong> Nếu bạn không thực hiện hành động này, rất có thể tài khoản của bạn đang bị xâm nhập. Vui lòng thiết lập lại mật khẩu mới hoặc liên hệ Quản trị viên ngay lập tức.
                </p>
              </div>

              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${process.env.WEB_URL || 'http://localhost:3000'}/login" style="display:inline-block;background-color:#f3f4f6;color:#374151;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;border:1px solid #e5e7eb;transition:all 0.2s;">Đăng nhập vào tài khoản</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color:#F8FAFC;padding:32px 40px;text-align:center;border-top:1px solid #f1f5f9;">
              <p style="color:#64748b;font-size:12px;line-height:1.6;margin:0;">
                © ${new Date().getFullYear()} Zalo Edu.<br>
                Mọi thông tin cá nhân của bạn đều được mã hóa bằng chuẩn AES-256.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Gửi email chứa mã xác thực OTP
 * @param {string} to - Email người nhận
 * @param {string} fullName - Tên người dùng
 * @param {string} otpCode - Mã OTP 6 số
 */
const sendVerificationEmail = async (to, fullName, otpCode) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Zalo Edu" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to,
    subject: `Mã Xác Thực OTP: ${otpCode} - Zalo Edu 🔐`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background-color:#E8ECF1;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.06);">
          
          <!-- Banner -->
          <tr>
            <td style="background-color:#0068ff;padding:40px 0;text-align:center;">
              <div style="width:64px;height:64px;background:#ffffff;border-radius:18px;margin:0 auto 16px;display:table;box-shadow:0 6px 16px rgba(0,0,0,0.15);">
                <div style="display:table-cell;vertical-align:middle;text-align:center;font-size:32px;color:#0068ff;font-weight:bold;line-height:1;">Z</div>
              </div>
              <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0;letter-spacing:-0.4px;">Xác Thực Tài Khoản</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding:48px 40px 32px;">
              <p style="color:#111827;font-size:18px;font-weight:600;margin:0 0 16px;">Xin chào ${fullName},</p>
              
              <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Cảm ơn bạn đã tham gia <strong>Zalo Edu</strong>! Để hoàn tất quá trình đăng ký, vui lòng sử dụng mã xác thực bảo mật 6 số dưới đây:
              </p>
              
              <div style="background-color:#F5F8FF;border:2px dashed #0068ff;border-radius:12px;padding:24px;text-align:center;margin:32px 0;">
                <p style="color:#0068ff;font-size:14px;font-weight:600;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">Mã OTP Của Bạn</p>
                <div style="font-size:36px;font-weight:800;color:#111827;letter-spacing:6px;">${otpCode}</div>
              </div>

              <div style="background-color:#FEF9C3;border-left:4px solid #EAB308;padding:16px 20px;border-radius:4px 8px 8px 4px;margin:24px 0;">
                <p style="color:#854D0E;font-size:14px;margin:0;line-height:1.5;">
                  <strong>⏳ Hạn sử dụng:</strong> Mã này chỉ có hiệu lực trong vòng <strong>10 phút</strong>. Tuyệt đối không chia sẻ mã này với bất kỳ ai để đảm bảo an toàn tài khoản.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color:#F8FAFC;padding:32px 40px;text-align:center;border-top:1px solid #f1f5f9;">
              <p style="color:#64748b;font-size:12px;line-height:1.6;margin:0;">
                © ${new Date().getFullYear()} Zalo Edu.<br>
                Mọi thông tin cá nhân của bạn đều được mã hóa bằng chuẩn AES-256.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * Gửi email mời Giảng viên kèm mật khẩu tạm thời
 * @param {string} to - Email người nhận
 * @param {string} fullName - Tên người dùng
 * @param {string} tempPassword - Mật khẩu sinh ngẫu nhiên
 */
const sendTeacherInvitationEmail = async (to, fullName, tempPassword) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"Zalo Edu" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to,
    subject: `Chào mừng gia nhập mạng lưới Zalo Edu 🎓`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background-color:#E8ECF1;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.06);">
          
          <!-- Banner -->
          <tr>
            <td style="background-color:#0068ff;padding:40px 0;text-align:center;">
              <div style="width:64px;height:64px;background:#ffffff;border-radius:18px;margin:0 auto 16px;display:table;box-shadow:0 6px 16px rgba(0,0,0,0.15);">
                <div style="display:table-cell;vertical-align:middle;text-align:center;font-size:32px;color:#0068ff;font-weight:bold;line-height:1;">Z</div>
              </div>
              <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0;letter-spacing:-0.4px;">Thông Tin Tài Khoản Giảng Viên</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding:48px 40px 32px;">
              <p style="color:#111827;font-size:18px;font-weight:600;margin:0 0 16px;">Kính chào thầy/cô ${fullName},</p>
              
              <p style="color:#4b5563;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Quản trị viên đã tạo cho thầy/cô một tài khoản đào tạo trên hệ thống <strong>Zalo Edu OTT</strong>. Dưới đây là thông tin đăng nhập tạm thời của thầy/cô:
              </p>
              
              <div style="background-color:#F5F8FF;border:2px solid #e0e7ff;border-radius:12px;padding:24px;margin:32px 0;">
                <p style="color:#4b5563;font-size:14px;margin:0 0 8px;"><strong>Tên Đăng Nhập:</strong> ${to}</p>
                <p style="color:#4b5563;font-size:14px;margin:0;"><strong>Mật Khẩu Mặc Định:</strong> <span style="font-family:monospace;font-size:16px;color:#0068ff;font-weight:bold;">${tempPassword}</span></p>
              </div>

              <div style="background-color:#FEF9C3;border-left:4px solid #EAB308;padding:16px 20px;border-radius:4px 8px 8px 4px;margin:24px 0;">
                <p style="color:#854D0E;font-size:14px;margin:0;line-height:1.5;">
                  <strong>⚠️ Bảo mật:</strong> Thầy/cô vui lòng đổi mật khẩu ngay trong lần đăng nhập đầu tiên để bảo vệ tài khoản cá nhân.
                </p>
              </div>

              <!-- Action Button -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:36px 0;">
                <tr>
                  <td align="center">
                    <a href="${process.env.WEB_URL || 'http://localhost:3000'}/login" style="display:inline-block;background-color:#0068ff;color:#ffffff;text-decoration:none;padding:16px 42px;border-radius:12px;font-size:16px;font-weight:600;box-shadow:0 6px 20px rgba(0, 104, 255, 0.3);border:1px solid #0050cd;transition:all 0.3s ease;">Đăng Nhập Ngay</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color:#F8FAFC;padding:32px 40px;text-align:center;border-top:1px solid #f1f5f9;">
              <p style="color:#64748b;font-size:12px;line-height:1.6;margin:0;">
                © ${new Date().getFullYear()} Zalo Edu.<br>
                Hệ sinh thái nền tảng giáo dục thông minh.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendResetPasswordEmail,
  sendPasswordChangedEmail,
  sendVerificationEmail,
  sendTeacherInvitationEmail,
};
