import { MAX_COOKIE_AGE } from "../config/constants.js";
import * as services from "../services/auth.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import { removeCookie, setCookie } from "../utils/cookie.js";

// ###### login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { user, sessionId } = await services.loginUser({
    email,
    password,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  setCookie(res, "sid", sessionId, {
    maxAge: MAX_COOKIE_AGE,
  });

  res.json({
    success: true,
    message: "Login successful",
    user,
  });
});

// ##### loginWithGoogle
export const loginWithGoogle = asyncHandler(async (req, res, next) => {
  const { idToken } = req.body;

  const { user, sessionId } = await services.loginWithGoogle({
    idToken,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
  setCookie(res, "sid", sessionId, {
    maxAge: MAX_COOKIE_AGE,
  });
  res.json({
    success: true,
    message: "Login with Google successful",
    user,
  });
});

// REGISTER (NEW ACCOUNT CREATION)
export const register = asyncHandler(async (req, res, next) => {
  const { email, name, password } = req.body;

  const user = await services.registerUser({
    name,
    email,
    password,
  });

  return res
    .status(201)
    .json({ status: true, message: "User registered successfully", user });
});

// LOGOUT
export const logout = asyncHandler(async (req, res) => {
  const sessionId = req.session.sessionId;

  await services.logoutUser({ sessionId });
  removeCookie(res, "sid");

  res.json({
    success: true,
    message: "Logged out successfully",
  });
});

// GET LOGGED IN USER PROFILE
export const me = asyncHandler(async (req, res) => {
  const userProfile = await services.getUserProfile(req.user._id);

  res.json({
    success: true,
    user: userProfile,
  });
});
