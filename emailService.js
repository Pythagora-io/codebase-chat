const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,  // Use the SMTP server host from .env
  port: parseInt(process.env.EMAIL_PORT, 10), // Use the SMTP server port from .env
  secure: process.env.EMAIL_SECURE === 'true', // Convert EMAIL_SECURE string to boolean
  auth: {
    user: process.env.EMAIL_USER,     // Authentication email address from .env
    pass: process.env.EMAIL_PASSWORD  // Email password from .env
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function sendEmailNotification(email, uuid, repoUrl) {
  console.log(`Preparing to send email notification to ${email}`); // gpt_pilot_debugging_log

  const mailOptions = {
    from: process.env.EMAIL_FROM, // Sender address from .env
    to: email,
    subject: 'Your repo is ready for a chat!',
    html: `The repository <a href="${repoUrl}">${repoUrl}</a> has been analyzed. You can chat with it at <a href="${process.env.BASE_URL}/explain/${uuid}">${process.env.BASE_URL}/explain/${uuid}</a>.`
  };

  console.log(`Sending email to ${email} with subject: "${mailOptions.subject}"`); // gpt_pilot_debugging_log

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${email} with response: ${JSON.stringify(result)}`); // gpt_pilot_debugging_log
  } catch (error) {
    console.error(`Failed to send email notification: ${error}`, error.stack); // gpt_pilot_debugging_log
    throw error;
  }
}

module.exports = {
  sendEmailNotification
};