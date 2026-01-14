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

const router = Router();

router.post("/login", validate(loginSchema), login);
router.post("/login/google", loginWithGoogle);
router.get("/me", authMiddleware, me);
router.post("/logout", authMiddleware, logout);
router.post("/register", validate(registerSchema), register);

export default router;
