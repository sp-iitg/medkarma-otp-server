require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

// Node.js আধুনিক ভার্সনের জন্য নিরাপদ Firebase Admin ইমপোর্ট
const adminPackage = require('firebase-admin');
const admin = adminPackage.default || adminPackage;
const { cert } = require('firebase-admin/app');

// Firebase Admin SDK ইনিশিয়ালাইজেশন
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: cert(serviceAccount)
});

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

// ১. ওটিপি পাঠানোর API
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  // ৬ ডিজিটের নতুন ওটিপি
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // মেয়াদ ৫ মিনিট

  otpStore.set(email, { otp, expiresAt });

  // ডার্ক ব্র্যান্ডিং ও ছবির মতো কাস্টম লোগো টেমপ্লেট
  const mailOptions = {
    from: `"MedKarma" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `${otp} is your MedKarma verification code`,
    text: `Your MedKarma verification code is: ${otp}. Valid for 5 minutes.`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        
        <!-- হিডেন প্রি-হেডার টেক্সট: জিমেইলকে দ্রুত ওটিপি সনাক্ত করতে সাহায্য করে -->
        <div style="display: none; font-size: 1px; color: #0f172a; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
          Your MedKarma verification code is ${otp}.
        </div>

        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
          <tr>
            <td align="center" style="padding: 40px 10px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #0a0f1d; border-radius: 16px; border: 1px solid #1e293b; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); overflow: hidden;">
                
                <!-- ছবির মতো লোগো সেকশন -->
                <tr>
                  <td align="center" style="padding: 38px 20px 20px 20px; background-color: #050811;">
                    <div style="font-size: 38px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase;">
                      <span style="color: #FFFFFF;">MED</span><span style="color: #00BFFF;">K</span><span style="color: #2F80ED;">A</span><span style="color: #7952DE;">R</span><span style="color: #BB3BAE;">M</span><span style="color: #FF007F;">A</span>
                    </div>
                  </td>
                </tr>

                <!-- হেডার ও ডেসক্রিপশন -->
                <tr>
                  <td style="padding: 25px 35px 15px 35px; text-align: center;">
                    <h2 style="color: #f8fafc; font-size: 20px; font-weight: 700; margin: 0 0 10px 0;">Verify your email address</h2>
                    <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0;">
                      Thank you for joining MedKarma. Please enter the verification code below to verify your account and get started.
                    </p>
                  </td>
                </tr>

                <!-- OTP বক্স -->
                <tr>
                  <td align="center" style="padding: 15px 35px 25px 35px;">
                    <div style="background-color: #111827; border: 1.5px dashed #38bdf8; border-radius: 14px; padding: 18px 30px; display: inline-block;">
                      <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #ffffff; font-family: monospace;">${otp}</span>
                    </div>
                    <p style="color: #64748b; font-size: 13px; font-weight: 500; margin: 12px 0 0 0;">
                      Valid for <span style="color: #38bdf8; font-weight: 700;">5 minutes</span> only.
                    </p>
                  </td>
                </tr>

                <!-- সিকিউরিটি নোটিশ -->
                <tr>
                  <td style="padding: 0 35px 25px 35px;">
                    <div style="background-color: #0f172a; border-radius: 8px; padding: 12px 16px; border-left: 4px solid #f59e0b;">
                      <p style="color: #cbd5e1; font-size: 12px; line-height: 1.5; margin: 0;">
                        <strong style="color: #f59e0b;">Security Notice:</strong> Never share this OTP with anyone. MedKarma team members will never ask for your code.
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- ফুটার -->
                <tr>
                  <td style="padding: 20px 35px 30px 35px; border-top: 1px solid #1e293b; text-align: center;">
                    <p style="color: #64748b; font-size: 12px; margin: 0;">
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

// ২. ওটিপি যাচাই ও ফায়ারবেস কাস্টম টোকেন তৈরি
app.post('/api/verify-otp', async (req, res) => {
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

  otpStore.delete(email);

  try {
    // ফায়ারবেসে ইউজার চেক অথবা নতুন তৈরি
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        userRecord = await admin.auth().createUser({ email: email });
      } else {
        throw err;
      }
    }

    // ফায়ারবেসের কাস্টম টোকেন তৈরি
    const firebaseToken = await admin.auth().createCustomToken(userRecord.uid);

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      firebaseToken: firebaseToken
    });

  } catch (firebaseErr) {
    console.error('Firebase Auth error:', firebaseErr);
    return res.status(500).json({ success: false, message: 'Failed to create Firebase token' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
