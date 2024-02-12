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

async function sendEmailNotification(email, type, repoUrl, uuid) {
  let subject, html;
  if (type === 'no-text-files') {
    subject = 'Analysis of your repository';
    html = `The repository <${repoUrl}> has been analyzed. Since it doesn't contain any text files, we couldn't process it at the moment. Please try again with a different repository.`;
    console.log(`Preparing to send 'no text files found' email to: ${email}`); // gpt_pilot_debugging_log
  } else {
    subject = 'Your repo is ready for a chat!';
    html = `The repository <a href="${repoUrl}">${repoUrl}</a> has been analyzed. You can chat with it at <a href="${process.env.BASE_URL}/explain/${uuid}">${process.env.BASE_URL}/explain/${uuid}</a>.`;
    console.log(`Preparing to send 'repo ready' notification email to: ${email}`); // gpt_pilot_debugging_log
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: subject,
    html: html
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log(`${type === 'no-text-files' ? 'No text files email' : 'Processing completed email'} sent successfully to ${email}. Result: ${JSON.stringify(result)}`); // gpt_pilot_debugging_log
  } catch (error) {
    console.error(`Failed to send ${type === 'no-text-files' ? 'no text files email' : 'processing completed email'} notification: ${error}`, error.stack); // gpt_pilot_debugging_log
    throw error;
  }
}

module.exports = {
  sendEmailNotification
};