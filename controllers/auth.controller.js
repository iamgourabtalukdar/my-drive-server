import mongoose from "mongoose";
import { MAX_COOKIE_AGE } from "../config/constants.js";
import Folder from "../models/Folder.model.js";
import Session from "../models/Session.model.js";
import User from "../models/User.model.js";
import * as services from "../services/auth.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import { removeCookie, setCookie } from "../utils/cookie.js";
import { verifyIdTokenAndGetUser } from "../utils/googleAuth.js";

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
export const loginWithGoogle = async (req, res, next) => {
  try {
    const { idToken } = req.body || {};

    if (!idToken) {
      return res.status(404).json({
        status: false,
        errors: {
          message: "Token is missing",
        },
      });
    }
    const { email, name, picture } = await verifyIdTokenAndGetUser(idToken);

    const user = await User.findOne({ email }).select("_id").lean();

    if (user) {
      //login user
      const loginCount = await Session.countDocuments({ userId: user._id });

      if (loginCount > 1) {
        await Session.deleteMany({ userId: user._id });
      }
      const session = await Session.create({ userId: user._id });

      res.cookie("token", session.id, {
        httpOnly: true,
        signed: true,
        sameSite: "none",
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        status: true,
        data: { message: "Login successful" },
      });
    } else {
      //create user
      const mongooseSession = await mongoose.startSession();
      mongooseSession.startTransaction();
      try {
        const userId = new mongoose.Types.ObjectId();
        const rootFolderId = new mongoose.Types.ObjectId();

        // Using .create() with a session requires passing the documents in an array
        await User.create(
          [
            {
              _id: userId,
              name,
              email,
              picture,
              rootFolderId,
            },
          ],
          { session: mongooseSession }
        );
        // Using .create() with a session requires passing the documents in an array
        await Folder.create(
          [
            {
              _id: rootFolderId,
              name: `root-${userId}`,
              userId,
              parentFolderId: null,
            },
          ],
          { session: mongooseSession }
        );

        const session = await Session.create({ userId: userId });

        res.cookie("token", session.id, {
          httpOnly: true,
          signed: true,
          sameSite: "none",
          secure: true,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        await mongooseSession.commitTransaction();
        return res
          .status(201)
          .json({ status: true, message: "New User Created" });
      } catch (error) {
        console.log(error);
        await mongooseSession.abortTransaction();
        next(error);
      } finally {
        mongooseSession.endSession();
      }
    }
  } catch (err) {
    next(err);
  }
};

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
    profile: userProfile,
  });
});
