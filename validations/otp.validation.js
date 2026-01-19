import { z } from "zod";

export const verifyEmailSchema = z.object({
  body: z.object({
    email: z.email("Please enter a valid email"),

    otp: z
      .string("Please enter a valid OTP string")
      .min(6, "OTP must be 6 characters long"),
  }),
});

export const resendEmailOtpSchema = z.object({
  body: z.object({
    email: z.email("Please enter a valid email"),
  }),
});
