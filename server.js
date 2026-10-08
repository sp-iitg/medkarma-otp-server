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

// ১. সার্ভার সজাগ ও পিং রাখার রুট (ক্রন-জব ও ব্রাউজারের জন্য)
app.get('/', (req, res) => {
  res.status(200).send('MedKarma Server is Running Live!');
});

// সাময়িক ওটিপি স্টোর (মেমোরি)
const otpStore = new Map();

// জিমেইল ট্রান্সপোর্টার (Port 465 ও Timeout ফিক্স সহ)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,         
  secure: true,      
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  // সার্ভার হ্যাং হওয়া আটকাতে টাইমআউট কনফিগারেশন
  connectionTimeout: 10000, 
  greetingTimeout: 10000,   
  socketTimeout: 15000      
});

// ২. ওটিপি পাঠানোর API (Fast Response যুক্ত)
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  // ৬ ডিজিটের নতুন ওটিপি
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // মেয়াদ ৫ মিনিট

  otpStore.set(email, { otp, expiresAt });

  // AMOLED Black (#000000) লোগো ব্যাকগ্রাউন্ড সহ ডার্ক টেমপ্লেট
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
      <body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        
        <div style="display: none; font-size: 1px; color: #000000; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
          Your MedKarma verification code is ${otp}.
        </div>

        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #000000;">
          <tr>
            <td align="center" style="padding: 40px 10px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #050505; border-radius: 16px; border: 1px solid #1e293b; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.8); overflow: hidden;">
                
                <!-- Cloudinary লোগো এবং এর পেছনে পিওর AMOLED Black ব্যাকগ্রাউন্ড -->
                <tr>
                  <td align="center" style="padding: 35px 20px 20px 20px; background-color: #000000;">
                    <img src="https://res.cloudinary.com/d4puny67/image/upload/f_auto/q_auto/file_000000005390821190f86576e343b442.png" alt="MedKarma" style="height: 42px; max-width: 220px; width: auto; display: block; border: 0;" />
                  </td>
                </tr>

                <tr>
                  <td style="padding: 25px 35px 15px 35px; text-align: center; background-color: #050505;">
                    <h2 style="color: #f8fafc; font-size: 20px; font-weight: 700; margin: 0 0 10px 0;">Verify your email address</h2>
                    <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0;">
                      Thank you for joining MedKarma. Please enter the verification code below to verify your account and get started.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding: 15px 35px 25px 35px; background-color: #050505;">
                    <div style="background-color: #000000; border: 1.5px dashed #38bdf8; border-radius: 14px; padding: 18px 30px; display: inline-block;">
                      <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #ffffff; font-family: monospace;">${otp}</span>
                    </div>
                    <p style="color: #64748b; font-size: 13px; font-weight: 500; margin: 12px 0 0 0;">
                      Valid for <span style="color: #38bdf8; font-weight: 700;">5 minutes</span> only.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 0 35px 25px 35px; background-color: #050505;">
                    <div style="background-color: #000000; border-radius: 8px; padding: 12px 16px; border-left: 4px solid #f59e0b;">
                      <p style="color: #cbd5e1; font-size: 12px; line-height: 1.5; margin: 0;">
                        <strong style="color: #f59e0b;">Security Notice:</strong> Never share this OTP with anyone. MedKarma team members will never ask for your code.
                      </p>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 20px 35px 30px 35px; border-top: 1px solid #1e293b; text-align: center; background-color: #050505;">
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

  // ১. অ্যাপকে সাথে সাথে ফাস্ট রেসপন্স দিয়ে দেওয়া হলো (জিরো লেটেন্সি)
  res.status(200).json({ success: true, message: 'OTP sending in background' });

  // ২. ব্যাকগ্রাউন্ডে ইমেইল পাঠানো হচ্ছে (অ্যাপকে আর হ্যাং হয়ে ওয়েট করতে হবে না)
  transporter.sendMail(mailOptions)
    .then(() => {
      console.log(`OTP sent successfully to ${email}`);
    })
    .catch((error) => {
      console.error('Background Email sending error:', error.message);
    });
});

// ৩. ওটিপি যাচাই ও ফায়ারবেস কাস্টম টোকেন তৈরি
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

  // ওটিপি ভেরিফাইড! মেমোরি থেকে মুছে ফেলা হলো
  otpStore.delete(email);

  try {
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

// পোর্ট লিসেন করা
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
