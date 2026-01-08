// import * as nodemailer from 'nodemailer';
// import { Transporter } from 'nodemailer';

// const transporter = nodemailer.createTransport({
//   host: process.env.EMAIL_HOST,
//   port: Number(process.env.EMAIL_PORT),
//   secure: false, // MUST be false for 587
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// // 🔥 ADD THIS ONCE (CRITICAL)
// interface VerifyCallback {
//   (error: Error | null, success: boolean): void;
// }

// const verifyCallback: VerifyCallback = (error, success) => {
//   if (error) {
//     console.error('❌ SMTP VERIFY FAILED:', error);
//   } else {
//     console.log('✅ SMTP SERVER READY');
//   }
// };

// transporter.verify(verifyCallback);

// export async function sendPasswordResetEmail(
//   to: string,
//   resetToken: string
// ) {
//   const resetLink = `${process.env.UI_APP_URL}/reset-password?token=${resetToken}`;

//   const info = await transporter.sendMail({
//     from: `"Expense Tracker" <${process.env.EMAIL_USER}>`,
//     to,
//     subject: 'Reset your password',
//     html: `
//       <p>You requested a password reset.</p>
//       <p>This link is valid for <b>15 minutes</b>.</p>
//       <a href="${resetLink}">Reset Password</a>
//       <p>If you didn’t request this, ignore this email.</p>
//     `,
//   });

//   console.log('📨 EMAIL SENT:', info.messageId);
// }

import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false, // MUST be false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 🔥 ADD THIS ONCE (CRITICAL)
interface VerifyCallback {
  (error: Error | null, success: boolean): void;
}

const verifyCallback: VerifyCallback = (error, success) => {
  if (error) {
    console.error('❌ SMTP VERIFY FAILED:', error);
  } else {
    console.log('✅ SMTP SERVER READY');
  }
};

transporter.verify(verifyCallback);

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string
) {
  const resetLink = `${process.env.UI_APP_URL}/reset-password?token=${resetToken}`;

  const info = await transporter.sendMail({
    from: `"Expense Tracker" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Reset your password',
    html: `
      <p>You requested a password reset.</p>
      <p>This link is valid for <b>15 minutes</b>.</p>
      <a href="${resetLink}">Reset Password</a>
      <p>If you didn’t request this, ignore this email.</p>
    `,
  });

  console.log('📨 EMAIL SENT:', info.messageId);
}
