const { sendEmail } = require('./utils/email');

(async () => {
  try {
    await sendEmail({
      to: 'hatdekhocnhehuhu@gmail.com', // The email in the user's screenshot
      subject: 'Test Email',
      text: 'This is a test email',
      html: '<p>This is a test email</p>'
    });
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Email failed:', error);
  }
})();
