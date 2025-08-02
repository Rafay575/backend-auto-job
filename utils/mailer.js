const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendOtpEmail = async (to, otp) => {
  const html = `
    <p>Your OTP for password reset is: <b>${otp}</b>.</p>
    <p>This OTP is valid for 10 minutes.</p>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USERNAME,
    to,
    subject: 'Your OTP Code',
    html
  });
};

module.exports = { sendOtpEmail };