import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send password reset email (NON-BLOCKING SAFE)
 */
export async function sendPasswordResetEmail(
  to: string,
  resetToken: string
) {
  if (!process.env.RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY missing");
    return;
  }

  const resetLink = `${process.env.UI_APP_URL}/reset-password?token=${resetToken}`;

  await resend.emails.send({
    from: "Expense Tracker <onboarding@resend.dev>",
    to,
    subject: "Reset your password",
    html: `
      <p>You requested a password reset.</p>
      <p>This link is valid for <b>15 minutes</b>.</p>
      <p>
        <a href="${resetLink}" target="_blank">Reset Password</a>
      </p>
      <p>If you didn’t request this, ignore this email.</p>
    `,
  });
}
