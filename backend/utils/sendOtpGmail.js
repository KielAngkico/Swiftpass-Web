const nodemailer = require('nodemailer');
require('dotenv').config();

const sendOtpEmail = async (toEmail, otp) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"SwiftPass" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your OTP Verification Code',
    text: `Your One-Time Password (OTP) is: ${otp}`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
  } catch (err) {
    console.error('Error sending OTP email:', err);
    throw new Error('Failed to send OTP email');
  }
};

module.exports = { sendOtpEmail };
