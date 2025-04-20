import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/userModel.js";
import Folder from "../models/folderModel.js";

const userInputValidation = {
  name: {
    required: [true, "Please enter name"],
    minLength: [3, "name length should be minimum 3 characters"],
    maxLength: [30, "name length should be maximum 30 characters"],
  },
  email: {
    required: [true, "Please enter email"],
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
  },
  password: {
    required: [true, "Please enter password"],
    minLength: [4, "Password must be at least 4 characters"],
    maxLength: [16, "Password must be maximum 16 characters"],
  },
};

function validateInput(inputData) {
  const errors = {};
  const keysArr = Object.keys(inputData);

  keysArr.forEach((key) => {
    const fieldRules = userInputValidation[key];
    const value = inputData[key]?.trim();

    // Check required field
    if (fieldRules.required?.[0] && !value) {
      errors[key] = fieldRules.required[1];
      return; // Skip other checks if required field is missing
    }

    // Skip further checks if value is empty (and not required)
    if (!value) return;

    // Check minLength
    if (fieldRules.minLength && value.length < fieldRules.minLength[0]) {
      errors[key] = fieldRules.minLength[1];
    }

    // Check maxLength
    if (fieldRules.maxLength && value.length > fieldRules.maxLength[0]) {
      errors[key] = fieldRules.maxLength[1];
    }

    // Check regex match
    if (fieldRules.match && !fieldRules.match[0].test(value)) {
      errors[key] = fieldRules.match[1];
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// SIGN UP (NEW ACCOUNT CREATION)
export async function signup(req, res, next) {
  const { name, email, password } = req.body || {};

  try {
    const userInputValidity = validateInput({ name, email, password });

    if (!userInputValidity.isValid) {
      return res
        .status(400)
        .json({ status: false, errors: userInputValidity.errors });
    }

    const user = await User.findOne({ email }).select("_id").lean();

    if (user) {
      return res
        .status(409)
        .json({ status: false, errors: { email: "Email already exists" } });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const userId = new mongoose.Types.ObjectId();
      const rootFolderId = new mongoose.Types.ObjectId();

      const hashedPassword = await bcrypt.hash(password, 12);
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

      //check this
      await Folder.create(
        [
          {
            _id: rootFolderId,
            name: `root-${email}`,
            userId,
            parentFolderId: null,
          },
        ],
        { session }
      );

      await session.commitTransaction();
      return res
        .status(201)
        .json({ status: true, message: "New User Created" });
    } catch (error) {
      console.log(error);
      await session.abortTransaction();
      next(error);
    } finally {
      await session.endSession();
    }
  } catch (error) {
    next(error);
  }
}

// #### Signin (LOGIN)

export async function signin(req, res, next) {
  const { email, password } = req.body || {};

  try {
    //validation email
    const userInputValidity = validateInput({ email, password });

    if (!userInputValidity.isValid) {
      return res
        .status(400)
        .json({ status: false, errors: userInputValidity.errors });
    }

    const user = await User.findOne({ email }).select("_id password").lean();

    if (!user) {
      return res.status(401).json({
        status: false,
        errors: { message: "Email doesn't exists! Please Signup" },
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res
        .status(401)
        .json({ status: false, errors: { message: "Invalid Credentials" } });
    }

    //creating cookie
    const sevenDaysInMs = 1000 * 60 * 60 * 24 * 7;
    // const sevenDaysInMs = 1000 * 10;

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
