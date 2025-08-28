import { Router } from "express";
import {
  login,
  logout,
  signup,
  verifyLogin,
} from "../controllers/authController.js";

const router = Router();

router.route("/login").post(login);
router.route("/verify").get(verifyLogin);
router.route("/logout").post(logout);
router.route("/signup").post(signup);

export default router;
