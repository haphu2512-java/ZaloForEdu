const nodemailer = require('nodemailer');
const logger = require('./logger');
const env = require('../config/env');

let smtpTransporterPromise = null;
let etherealTransporterPromise = null;

const createSmtpTransporter = () =>
  nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
    tls: {
      rejectUnauthorized: env.smtpAllowUnauthorized ? false : true,
    },
  });

const getEtherealTransporter = async () => {
  if (!etherealTransporterPromise) {
    etherealTransporterPromise = (async () => {
      const account = await nodemailer.createTestAccount();
      logger.info(`Using Ethereal SMTP account: ${account.user}`);
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: account.user,
          pass: account.pass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
    })();
  }
  return etherealTransporterPromise;
};

const getTransporter = async () => {
  if (env.smtpUseEthereal || !env.smtpHost) {
    return getEtherealTransporter();
  }

  if (!smtpTransporterPromise) {
    smtpTransporterPromise = Promise.resolve(createSmtpTransporter());
  }
  return smtpTransporterPromise;
};

const logPreviewUrlIfAny = (info) => {
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    logger.info(`Ethereal preview: ${previewUrl}`);
    console.log(`[EMAIL] Ethereal preview: ${previewUrl}`);
  }
};

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: env.smtpFrom || '"Zalo Clone" <noreply@example.com>',
      to,
      subject,
      text,
      html,
    });
    logger.info(`Email sent: ${info.messageId}`);
    console.log(`[EMAIL] ✅ Đã gửi email tới ${to} | messageId: ${info.messageId}`);
    logPreviewUrlIfAny(info);
    return info;
  } catch (error) {
    // Chỉ fallback sang Ethereal nếu đã bật SMTP_USE_ETHEREAL=true
    // Nếu dùng Gmail thật (SMTP_USE_ETHEREAL=false) thì throw ngay để lỗi nổi lên
    if (env.smtpUseEthereal) {
      logger.warn(`Ethereal fallback: ${error.message}`);
      const fallbackTransporter = await getEtherealTransporter();
      const info = await fallbackTransporter.sendMail({
        from: env.smtpFrom || '"Zalo Clone" <noreply@example.com>',
        to,
        subject,
        text,
        html,
      });
      logger.info(`Email sent via Ethereal fallback: ${info.messageId}`);
      console.log(`[EMAIL] Sent via fallback: ${info.messageId}`);
      logPreviewUrlIfAny(info);
      return info;
    }

    logger.error(`❌ Lỗi gửi email tới ${to}: ${error.message}`);
    console.error(`[EMAIL] ❌ SMTP Error gửi tới ${to}:`, error.message);
    throw error;
  }
};

module.exports = {
  sendEmail,
};
