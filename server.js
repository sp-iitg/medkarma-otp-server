require('dotenv').config();
const express = require('express');
const { Resend } = require('resend');
const cors = require('cors');

// Firebase Admin SDK-এর সঠিক ও আধুনিক ইমপোর্ট
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// Service Account Key লোড করা
const serviceAccount = require('./serviceAccountKey.json');

// Firebase App ইনিশিয়ালাইজেশন
const firebaseApp = initializeApp({
  credential: cert(serviceAccount)
});

// সরাসরি Auth ইন্সট্যান্স নেওয়া (admin.auth is not a function ফিক্স)
const auth = getAuth(firebaseApp);

const app = express();
app.use(cors());
app.use(express.json());

// Resend ইনিশিয়ালাইজেশন
const resend = new Resend(process.env.RESEND_API_KEY);

// ১. সার্ভার সজাগ ও পিং রাখার রুট
app.get('/', (req, res) => {
  res.status(200).send('MedKarma Server is Running Live!');
});

// সাময়িক ওটিপি স্টোর (মেমোরি)
const otpStore = new Map();

// ২. ওটিপি পাঠানোর API (কাস্টম ডোমেন + Non-Replyable)
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  // ৬ ডিজিটের নতুন ওটিপি
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // মেয়াদ ৫ মিনিট

  otpStore.set(email, { otp, expiresAt });

  // ডার্ক টেমপ্লেট
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <div style="display: none; font-size: 1px; color: #0b0f19; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
        Your MedKarma verification code is ${otp}. Do not share this code with anyone.
      </div>

      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #0b0f19;">
        <tr>
          <td align="center" style="padding: 40px 10px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #0f172a; border-radius: 16px; border: 1px solid #1e293b; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6); overflow: hidden;">
              
              <!-- লোগো হেডার সেকশন -->
              <tr>
                <td align="center" style="padding: 32px 20px 24px 20px; background-color: #000000; border-bottom: 1px solid #1e293b;">
                  <img src="https://res.cloudinary.com/d4puny67/image/upload/f_auto/q_auto/file_000000005390821190f86576e343b442.png" alt="MedKarma" style="height: 42px; max-width: 220px; width: auto; display: block; border: 0;" />
                </td>
              </tr>

              <!-- কার্ড বডি -->
              <tr>
                <td style="padding: 28px 35px 15px 35px; text-align: center;">
                  <h2 style="color: #f8fafc; font-size: 20px; font-weight: 700; margin: 0 0 10px 0;">Verify your email address</h2>
                  <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0;">
                    Thank you for joining MedKarma. Please enter the verification code below to verify your account and get started.
                  </p>
                </td>
              </tr>

              <!-- OTP বক্স -->
              <tr>
                <td align="center" style="padding: 15px 35px 25px 35px;">
                  <div style="background-color: #0a0f1d; border: 1.5px dashed #38bdf8; border-radius: 14px; padding: 18px 32px; display: inline-block;">
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
                  <div style="background-color: #0a0f1d; border-radius: 8px; padding: 12px 16px; border-left: 4px solid #f59e0b;">
                    <p style="color: #cbd5e1; font-size: 12px; line-height: 1.5; margin: 0;">
                      <strong style="color: #f59e0b;">Security Notice:</strong> Never share this OTP with anyone. MedKarma team members will never ask for your code.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- ফুটার -->
              <tr>
                <td style="padding: 20px 35px 30px 35px; border-top: 1px solid #1e293b; text-align: center;">
                  <p style="color: #475569; font-size: 11px; margin: 0 0 8px 0;">
                    This is an automated message, please do not reply to this email.
                  </p>
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
  `;

  // অ্যাপকে সাথে সাথে ফাস্ট রেসপন্স
  res.status(200).json({ success: true, message: 'OTP sent successfully' });

  // ব্যাকগ্রাউন্ডে Resend দিয়ে ইমেইল সেন্ড
  try {
    const { data, error } = await resend.emails.send({
      from: 'MedKarma <verify@medkarma.in>',
      replyTo: 'no-reply@medkarma.in',
      to: [email],
      subject: `${otp} is your MedKarma verification code`,
      text: `Your MedKarma verification code is: ${otp}. Valid for 5 minutes. Please do not reply to this automated email.`,
      html: emailHtml,
      headers: {
        'X-Auto-Response-Suppress': 'All',
        'Auto-Submitted': 'auto-generated'
      }
    });

    if (error) {
      console.error('Resend API Error:', error);
    } else {
      console.log(`OTP sent successfully to ${email} (ID: ${data.id})`);
    }
  } catch (err) {
    console.error('Unexpected Resend Error:', err.message);
  }
});

// ৩. ওটিপি যাচাই ও ফায়ারবেস কাস্টম টোকেন তৈরি (getAuth দিয়ে ফিক্সড)
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

  try {
    let userRecord;
    try {
      // সরাসরি auth ইন্সট্যান্স ব্যবহার করা হচ্ছে
      userRecord = await auth.getUserByEmail(email);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        userRecord = await auth.createUser({ email: email });
      } else {
        throw err;
      }
    }

    // ফায়ারবেস কাস্টম টোকেন জেনারেট করা
    const firebaseToken = await auth.createCustomToken(userRecord.uid);

    // টোকেন সফলভাবে তৈরি হলেই ওটিপি ডিলিট হবে
    otpStore.delete(email);

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      firebaseToken: firebaseToken 
    });

  } catch (firebaseErr) {
    console.error('Firebase Auth Detailed Error:', firebaseErr);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create Firebase token' 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
