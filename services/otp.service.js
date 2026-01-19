import crypto from "crypto";
import mongoose from "mongoose";
import {
  EMAIL_VERIFICATION_OTP_EXPIRY_MINUTES,
  MAX_EMAIL_VERIFICATION_OTP_ATTEMPTS,
  RESEND_EMAIL_OTP_COOL_DOWN_SECONDS,
} from "../config/constants.js";
import EmailOtp from "../models/EmailOtp.model.js";
import User from "../models/User.model.js";
import AppError from "../utils/AppError.js";
import { createRootFolder } from "./folder.service.js";
import { sendVerificationEmail } from "./mail.service.js";

export function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit
}

export function hashOtp(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export async function createEmailOtp({ userId, purpose, expiryMinutes = 10 }) {
  const otp = generateOtp();
  await EmailOtp.deleteMany({ userId, purpose });

  await EmailOtp.create({
    userId,
    otpHash: hashOtp(otp),
    purpose,
    expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000), // expiryMinutes minutes
  });

  return otp;
}

export async function verifyEmail({ email, otp }) {
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError("User with this email does not exist", 400);
  }

  if (user.isEmailVerified) {
    throw new AppError("Email is already verified", 400);
  }

  const otpRecord = await EmailOtp.findOne({
    userId: user._id,
    purpose: "email_verification",
  });

  console.log(otpRecord);

  if (!otpRecord) {
    throw new AppError("No OTP found", 400);
  }

  if (otpRecord.expiresAt < new Date()) {
    throw new AppError("OTP has expired", 400);
  }

  if (otpRecord.attempts >= MAX_EMAIL_VERIFICATION_OTP_ATTEMPTS) {
    throw new AppError("Maximum OTP verification attempts exceeded", 400);
  }

  if (otpRecord.otpHash !== hashOtp(otp)) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    throw new AppError("Invalid OTP", 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const rootFolder = await createRootFolder({ userId: user._id, session });

    user.rootFolderId = rootFolder._id;
    user.isEmailVerified = true;
    user.emailVerifiedAt = new Date();

    await user.save({ session });
    await otpRecord.deleteOne({ session });

    await session.commitTransaction();
    return user;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
}

export async function resendEmailOtp({ email }) {
  const user = await User.findOne({ email }).lean();

  if (!user) {
    throw new AppError("User with this email does not exist", 400);
  }

  if (user.isEmailVerified) {
    throw new AppError("Email is already verified", 400);
  }

  const lastOtp = await EmailOtp.findOne({
    userId: user._id,
    purpose: "email_verification",
  })
    .sort({ createdAt: -1 })
    .lean();

  if (lastOtp) {
    const timeSinceLastOtp =
      (Date.now() - new Date(lastOtp.createdAt).getTime()) / 1000;
    if (timeSinceLastOtp < RESEND_EMAIL_OTP_COOL_DOWN_SECONDS) {
      throw new AppError(
        `Please wait ${Math.ceil(RESEND_EMAIL_OTP_COOL_DOWN_SECONDS - timeSinceLastOtp)} seconds before requesting a new OTP`,
        400,
      );
    }
  }
  await EmailOtp.deleteMany({
    userId: user._id,
    purpose: "email_verification",
  });

  // send otp for email verification
  const otp = await createEmailOtp({
    userId: user._id,
    purpose: "email_verification",
    expiryMinutes: EMAIL_VERIFICATION_OTP_EXPIRY_MINUTES,
  });
  await sendVerificationEmail({
    name: user.name,
    email,
    otp,
    expiryMinutes: EMAIL_VERIFICATION_OTP_EXPIRY_MINUTES,
  });

  return true;
}
