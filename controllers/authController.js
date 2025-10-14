import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/userModel.js";
import Session from "../models/sessionModel.js";
import Folder from "../models/folderModel.js";
import { verifyIdTokenAndGetUser } from "../utils/googleAuth.js";
import { loginSchema, registerSchema } from "../validators/authSchema.js";
import { z } from "zod/v4";
import { clearAuthCookie } from "../utils/clearAuthCookies.js";

// ###### login
export const login = async (req, res, next) => {
  try {
    const { success, data, error } = loginSchema.safeParse(req.body);

    if (!success) {
      return res.status(400).json({
        status: false,
        errors: z.flattenError(error).fieldErrors,
      });
    }

    const { email, password } = data;

    const user = await User.findOne({ email })
      .select("_id userId email password")
      .lean();

    if (!user) {
      return res.status(404).json({
        status: false,
        errors: {
          message: "Invalid Login Credentials",
        },
      });
    }

    if (!user.password) {
      return res.status(400).json({
        status: false,
        errors: {
          message:
            "It seems like you have registered with social login buttons (eg: google). Please login with the same.",
        },
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(404).json({
        status: false,
        errors: {
          message: "Invalid Login Credentials",
        },
      });
    }

    await Session.deleteOne({ userId: user._id });
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
  } catch (err) {
    next(err);
  }
};

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
      await Session.deleteOne({ userId: user._id });
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

// ###### verify login
export const verifyLogin = async (req, res, next) => {
  try {
    const { token } = req.signedCookies;

    if (!token) {
      res.clearCookie("token");
      return res.status(401).json({
        status: false,
        errors: {
          message: "Unauthorized: No token found",
          path: "/login",
        },
      });
    }
    const session = await Session.findById(token)
      .select("userId")
      .populate("userId", "name");

    if (!session) {
      res.clearCookie("token");
      return res.status(401).json({
        status: false,
        errors: {
          message: "Unauthorized: No User found",
          path: "/login",
        },
      });
    }
    return res.status(200).json({
      status: true,
      message: "Valid Session.",
      data: { user: { name: session.userId.name } },
    });
  } catch (err) {
    next(err);
  }
};

// ###### logout
export const logout = async (req, res, next) => {
  try {
    const { token } = req.signedCookies;
    await Session.findByIdAndDelete(token);
    clearAuthCookie(req, res, "token");
    return res.status(200).json({
      status: true,
      message: "Logout successful",
      data: { message: "Logout successful" },
    });
  } catch (err) {
    next(err);
  }
};

// SIGN UP (NEW ACCOUNT CREATION)
export const signup = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { success, data, error } = registerSchema.safeParse(req.body);

    if (!success) {
      return res.status(400).json({
        status: false,
        errors: z.flattenError(error).fieldErrors,
      });
    }

    const { name, email, password } = data;

    const user = await User.findOne({ email }).select("_id").lean();

    if (user) {
      return res
        .status(409)
        .json({ status: false, errors: { message: "Email already exists" } });
    }

    const userId = new mongoose.Types.ObjectId();
    const rootFolderId = new mongoose.Types.ObjectId();

    const hashedPassword = await bcrypt.hash(password, 12);
    // Using .create() with a session requires passing the documents in an array
    await User.create(
      [
        {
          _id: userId,
          name,
          email,
          password: hashedPassword,
          rootFolderId,
        },
      ],
      { session }
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
      { session }
    );

    await session.commitTransaction();
    return res.status(201).json({ status: true, message: "New User Created" });
  } catch (error) {
    console.log(error);
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};
