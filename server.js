require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// সাময়িক ওটিপি স্টোর (মেমোরি)
const otpStore = new Map();

// জিমেইল ট্রান্সপোর্টার
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ১. ওটিপি পাঠানোর API (Send OTP)
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  // ৬ ডিজিটের নতুন র‍্যান্ডম ওটিপি তৈরি
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // মেয়াদ ৫ মিনিট

  // স্টোরে ওটিপি সংরক্ষণ (আগেরটা থাকলে ওভাররাইট হবে)
  otpStore.set(email, { otp, expiresAt });

  // প্রফেশনাল ইংরেজি ইমেইল টেমপ্লেট
  const mailOptions = {
    from: `"MedKarma" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `${otp} is your MedKarma verification code`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
          <tr>
            <td align="center" style="padding: 40px 10px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden;">
                
                <!-- Google Style Colorful Brand Logo -->
                <tr>
                  <td align="center" style="padding: 36px 20px 15px 20px;">
                    <div style="font-size: 32px; font-weight: 800; letter-spacing: -0.5px;">
                      <span style="color: #2563EB;">Med</span><span style="color: #7C3AED;">Karma</span>
                    </div>
                    <div style="width: 36px; height: 3px; background: linear-gradient(90deg, #2563EB, #7C3AED); margin: 8px auto 0 auto; border-radius: 2px;"></div>
                  </td>
                </tr>

                <!-- Header Title & Description -->
                <tr>
                  <td style="padding: 10px 35px 20px 35px; text-align: center;">
                    <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 10px 0;">Verify your email address</h2>
                    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0;">
                      Thank you for joining MedKarma. Please enter the following verification code to confirm your email and proceed.
                    </p>
                  </td>
                </tr>

                <!-- OTP Code Display Card -->
                <tr>
                  <td align="center" style="padding: 10px 35px 25px 35px;">
                    <div style="background-color: #f1f5f9; border: 2px dashed #94a3b8; border-radius: 12px; padding: 18px 28px; display: inline-block;">
                      <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1e293b; font-family: monospace;">${otp}</span>
                    </div>
                    <p style="color: #64748b; font-size: 13px; font-weight: 500; margin: 12px 0 0 0;">
                      This code is valid for <b>5 minutes</b>.
                    </p>
                  </td>
                </tr>

                <!-- Security Warning -->
                <tr>
                  <td style="padding: 0 35px 25px 35px;">
                    <div style="background-color: #f8fafc; border-radius: 8px; padding: 12px 16px; border-left: 4px solid #f59e0b;">
                      <p style="color: #475569; font-size: 12px; line-height: 1.5; margin: 0;">
                        <b>Security Notice:</b> Never share this code with anyone. MedKarma will never ask for your code via call or chat. If you did not request this, please disregard this email.
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 35px 30px 35px; border-top: 1px solid #f1f5f9; text-align: center;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                      © ${new Date().getFullYear()} MedKarma Inc. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP sent successfully to ${email}`);
    return res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Email sending error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// ২. ওটিপি যাচাই করার API (Verify OTP)
app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP are required' });
  }

  const record = otpStore.get(email);

  if (!record || Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ success: false, message: 'OTP expired or not found' });
  }

  if (record.otp !== otp.trim()) {
    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  }

  // সঠিক হলে মেমোরি থেকে মুছে দেওয়া
  otpStore.delete(email);
  return res.status(200).json({ success: true, message: 'Email verified successfully' });
});

// সার্ভার পোর্ট লিসেন
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
