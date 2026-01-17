import bcrypt from "bcrypt";
import AppError from "../utils/AppError.js";
import User from "../models/User.model.js";
import Session from "../models/Session.model.js";
import mongoose from "mongoose";
import Folder from "../models/Folder.model.js";
import { verifyIdTokenAndGetUser } from "../utils/googleAuth.js";

export async function loginUser({ email, password, ip, userAgent }) {
  const user = await User.findOne({ email }).select("+password name email");

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new AppError("Invalid credentials", 401);
  }

  await Session.deleteMany({ userId: user._id });

  const sessionId = crypto.randomUUID();

  await Session.create({
    userId: user._id,
    sessionId,
    ip,
    userAgent,
    device: userAgent,
  });

  user.lastLogin = new Date();
  await user.save();

  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.lastLogin;

  return { user: userObj, sessionId };
}

export async function loginWithGoogle({ idToken, ip, userAgent }) {
  const { email, name, picture } = await verifyIdTokenAndGetUser(idToken);
  const sessionId = crypto.randomUUID();
  let userObj;

  const user = await User.findOne({ email }).select("_id name email ");

  if (!user) {
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

      await mongooseSession.commitTransaction();

      await Session.create({
        userId: userId,
        sessionId,
        ip,
        userAgent,
        device: userAgent,
      });
      userObj = { _id: userId, name, email, picture };
    } catch (error) {
      console.log(error);
      await mongooseSession.abortTransaction();
      throw error;
    } finally {
      mongooseSession.endSession();
    }
  } else {
    await Session.deleteMany({ userId: user._id });
    user.lastLogin = new Date();
    await user.save();

    await Session.create({
      userId: user._id,
      sessionId,
      ip,
      userAgent,
      device: userAgent,
    });
    userObj = user.toObject();
    delete userObj.lastLogin;
  }

  return { user: userObj, sessionId };
}

export async function registerUser({ name, email, password }) {
  const existingUser = await User.findOne({ email }).lean();

  if (existingUser) {
    throw new AppError("Email already in use", 400);
  }
  const userId = new mongoose.Types.ObjectId();
  const rootFolderId = new mongoose.Types.ObjectId();
  const hashedPassword = await bcrypt.hash(password, 12);
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
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
    return { name, email };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

export async function logoutUser({ sessionId }) {
  await Session.findOneAndDelete({
    sessionId,
  });
}

export async function getUserProfile(userId) {
  const user = await User.findById(userId)
    .select("name picture email storageSize rootFolderId")
    .populate({
      path: "rootFolderId",
      select: "size",
    })
    .lean();

  return {
    name: user.name,
    email: user.email,
    picture: user.picture,
    storageSize: user.storageSize,
    usedStorage: user.rootFolderId.size,
  };
}
