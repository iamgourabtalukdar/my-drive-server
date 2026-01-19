import { Schema, model } from "mongoose";
import { mongooseTransform } from "../utils/mongooseTransform.js";

const emailOtpSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    otpHash: {
      type: String,
      required: true,
    },

    purpose: {
      type: String,
      enum: ["email_verification", "password_reset"],
      required: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    strict: "throw",
    toJSON: { transform: mongooseTransform },
    toObject: { transform: mongooseTransform },
  },
);

// Auto delete expired OTPs
emailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const EmailOtp = model("EmailOtp", emailOtpSchema);
export default EmailOtp;
