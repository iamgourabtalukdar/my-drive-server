import { Resend } from "resend";
import AppError from "../utils/AppError.js";

const resend = new Resend(process.env.RESEND_EMAIL_API_KEY);

const emailTemplate = ({ name, otp, expiryMinutes }) => {
  return `<div style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:640px;margin:32px auto;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="background-color:#4f46e5;padding:24px 32px;">
      <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;text-align:center;">
        Your OTP Code
      </h1>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="margin:0 0 24px 0;color:#374151;font-size:16px;">
        Hello, <strong>${name}</strong>
      </p>

      <p style="margin:0 0 24px 0;color:#374151;font-size:16px;">
        Your One-Time Password (OTP) for account verification is:
      </p>

      <!-- OTP Box -->
      <div style="background-color:#f3f4f6;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:36px;font-weight:700;text-align:center;color:#4f46e5;letter-spacing:4px;">
          ${otp}
        </p>
      </div>

      <p style="margin:0 0 16px 0;color:#374151;font-size:16px;">
        This OTP is valid for <strong>${expiryMinutes} minutes</strong>. Please do not share this code with anyone.
      </p>

      <p style="margin:0 0 8px 0;color:#374151;font-size:16px;">
        If you didn't request this code, please ignore this email.
      </p>

      <p style="margin:0;color:#374151;font-size:16px;">
        Thank you for using our service!
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color:#f3f4f6;padding:16px 32px;">
      <p style="margin:0;font-size:14px;color:#4b5563;text-align:center;">
        © ${new Date().getFullYear()} Storage App. All rights reserved.
      </p>
    </div>

  </div>
</div>
`;
};

export async function sendVerificationEmail({
  name,
  email,
  otp,
  expiryMinutes = 10,
}) {
  const { data, error } = await resend.emails.send({
    from: "OTP - Storage App <otp.storage-app@gourab.tech>",
    to: email,
    subject: "Your Email Verification OTP",
    html: emailTemplate({ name, otp, expiryMinutes }),
  });

  if (error) {
    throw new AppError("Failed to send verification email", 500);
  }
  return data;
}
