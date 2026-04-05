const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    let transporterConfig;

    // Use environment variables if they exist
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
        transporterConfig = {
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT || 587,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        };
    } else {
        // Fallback: Create a fake testing account using Ethereal if no SMTP provided
        console.log('No SMTP config found. Generating Ethereal Test Account...');
        const testAccount = await nodemailer.createTestAccount();
        transporterConfig = {
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        };
    }

    const transporter = nodemailer.createTransport(transporterConfig);

    const message = {
        from: `${process.env.EMAIL_FROM_NAME || 'Zalo Edu App'} <${process.env.EMAIL_FROM || 'noreply@zaloedu.com'}>`,
        to: options.email,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text
    };

    const info = await transporter.sendMail(message);

    console.log(`Email sent: ${info.messageId}`);
    
    // Log the preview URL for Ethereal tests so dev can see it in terminal
    if (!process.env.EMAIL_HOST) {
        console.log('==================================================');
        console.log('📧 TEST EMAIL PREVIEW URL:');
        console.log(nodemailer.getTestMessageUrl(info));
        console.log('==================================================');
    }
};

module.exports = sendEmail;
