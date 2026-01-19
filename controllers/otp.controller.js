import * as services from "../services/otp.service.js";
import asyncHandler from "../utils/asyncHandler.js";

// VERIFY EMAIL OTP
export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  await services.verifyEmail({
    email,
    otp,
  });

  return res
    .status(200)
    .json({ status: true, message: "Email verified successfully" });
});

// RESEND EMAIL OTP
export const resendEmailOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  await services.resendEmailOtp({
    email,
  });

  return res
    .status(200)
    .json({ status: true, message: "Email OTP sent successfully" });
});
