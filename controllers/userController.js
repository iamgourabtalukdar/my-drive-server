import mongoose from "mongoose";
import User from "../models/userModel.js";

export async function signup(req, res, next) {
  const { name, email, password } = req.body || {};

  try {
    const userObj = {
      name: name?.trim(),
      email: email?.trim(),
      password: password?.trim(),
    };

    if (!userObj.name || !userObj.email || !userObj.password) {
      return res
        .status(400)
        .json({ status: false, error: "Please fill all the filled" });
    }

    const user = await User.findOne({ email: userObj.email }).lean();

    if (user) {
      return res
        .status(409)
        .json({ status: false, error: "Email already exists" });
    }

    const userId = new mongoose.Types.ObjectId();
    const rootFolderId = new mongoose.Types.ObjectId();
    await User.insertOne({ _id: userId, ...userObj, rootFolderId });

    return res.status(201).json({ status: true, message: "User created" });
  } catch (error) {
    next(error);
  }
}

// #### Signin (LOGIN)

export async function signin(req, res, next) {
  const { email, password } = req.body || {};

  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ status: false, error: "Please fill all the filled" });
    }

    const user = await User.findOne({ email, password }).lean();

    if (!user) {
      return res
        .status(409)
        .json({ status: false, error: "Invalid Credentials" });
    }

    //creating cookie
    // const sevenDaysInMs = 1000 * 60 * 60 * 24 * 7;
    const sevenDaysInMs = 1000 * 10;

    const payLoad = Buffer.from(
      JSON.stringify({
        uid: user._id,
        expiry: new Date(Date.now() + sevenDaysInMs).toISOString(),
      })
    ).toString("base64url");

    res.cookie("token", payLoad, {
      maxAge: sevenDaysInMs,
      httpOnly: true,
      secure: true,
      sameSite: "none",
      signed: true,
    });
    return res.status(200).json({ status: true, message: "Login Successful" });
  } catch (error) {
    next(error);
  }
}
