const nodemailer = require('nodemailer');

const isPlaceholder = (value) => {
    if (!value) return true;
    const placeholders = ['your-email', 'your_email', 'your-app-password', 'your_app_password', 'your-password'];
    return placeholders.some(p => value.toLowerCase().includes(p));
};

// Cache the Ethereal test account so we only create it once per server lifetime
let _cachedTestAccount = null;

const getEtherealTransporter = async () => {
    if (!_cachedTestAccount) {
        console.log('⚠️  No valid SMTP config. Creating Ethereal test account (one-time)...');
        _cachedTestAccount = await nodemailer.createTestAccount();
        console.log('✅ Ethereal test account ready:', _cachedTestAccount.user);
    }
    return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: _cachedTestAccount.user,
            pass: _cachedTestAccount.pass,
        },
        tls: {
            rejectUnauthorized: false,
        },
    });
};

const sendEmail = async (options) => {
    let transporter;
    let isEthereal = false;

    // Use environment variables if they exist AND are not placeholder values
    if (
        process.env.EMAIL_HOST &&
        process.env.EMAIL_USER &&
        !isPlaceholder(process.env.EMAIL_USER) &&
        !isPlaceholder(process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS)
    ) {
        transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT, 10) || 587,
            secure: parseInt(process.env.EMAIL_PORT, 10) === 465,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS,
            },
            tls: {
                // Allow self-signed certs in development
                rejectUnauthorized: process.env.NODE_ENV === 'production',
            },
        });
    } else {
        isEthereal = true;
        transporter = await getEtherealTransporter();
    }

    const message = {
        from: `${process.env.EMAIL_FROM_NAME || 'Zalo Edu App'} <${process.env.EMAIL_FROM || 'noreply@zaloedu.com'}>`,
        to: options.email,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text,
    };

    const info = await transporter.sendMail(message);
    console.log(`✅ Email sent: ${info.messageId}`);

    if (isEthereal) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('==================================================');
        console.log('📧 TEST EMAIL PREVIEW URL (Ethereal):');
        console.log(previewUrl);
        console.log('==================================================');
        // Return preview URL so callers can surface it in API response (dev mode)
        info.previewUrl = previewUrl;
    }

    return info;
};

module.exports = sendEmail;
