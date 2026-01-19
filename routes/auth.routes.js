import { Router } from "express";
import {
  login,
  loginWithGoogle,
  logout,
  me,
  register,
} from "../controllers/auth.controller.js";
import { loginSchema, registerSchema } from "../validations/auth.validation.js";
import { validate } from "../middlewares/validate.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { resendEmailOtp, verifyEmail } from "../controllers/otp.controller.js";
import {
  resendEmailOtpSchema,
  verifyEmailSchema,
} from "../validations/otp.validation.js";

const router = Router();

router.post("/register", validate(registerSchema), register);

//  EMAIL OTP
router.post("/verify-email", validate(verifyEmailSchema), verifyEmail);
router.post(
  "/resend-email-otp",
  validate(resendEmailOtpSchema),
  resendEmailOtp,
);

//  AUTH
router.post("/login", validate(loginSchema), login);
router.post("/login/google", loginWithGoogle);
router.get("/me", authMiddleware, me);
router.post("/logout", authMiddleware, logout);

export default router;
