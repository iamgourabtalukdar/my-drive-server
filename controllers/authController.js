import bcrypt from "bcrypt";
import User from "../models/userModel.js";
import Session from "../models/sessionModel.js";
import mongoose from "mongoose";

// ###### login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email) {
      return res.status(404).json({
        status: false,
        errors: {
          message: "email is required",
        },
      });
    }
    if (!password) {
      return res.status(404).json({
        status: false,
        errors: {
          message: "password is required",
        },
      });
    }
    const user = await User.findOne({ email })
      .select("_id userId password")
      .lean();

    if (!user) {
      return res.status(404).json({
        status: false,
        errors: {
          message: "Invalid Login Credentials",
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

    // await Session.deleteOne({ userId: user._id });
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
      message: "Login successful",
      data: { message: "Login successful" },
    });
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
    res.clearCookie("token");
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
export async function signup(req, res, next) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { name, email, password } = req.body || {};

    const user = await User.findOne({ email }).select("_id").lean();

    if (user) {
      return res
        .status(409)
        .json({ status: false, errors: { email: "Email already exists" } });
    }

    const userId = new mongoose.Types.ObjectId();
    const rootFolderId = new mongoose.Types.ObjectId();

    const hashedPassword = await bcrypt.hash(password, 12);
    await User.create(
      {
        _id: userId,
        name,
        email,
        password: hashedPassword,
        rootFolderId,
      },
      { session }
    );

    //check this
    await Folder.create(
      {
        _id: rootFolderId,
        name: `root-${email}`,
        userId,
        parentFolderId: null,
      },
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
}
