import { model, Schema } from "mongoose";
import { mongooseTransform } from "../utils/mongooseTransform.js";

const userSchema = new Schema(
  {
    name: {
      type: String,
      minLength: [3, "Name Should contain 3 characters"],
      maxLength: [30, "Name Should not exceed 30 characters"],
      required: true,
    },
    email: {
      type: String,
      required: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "please enter a valid email"],
      unique: true,
    },
    password: {
      type: String,
      minLength: [4, "Password should contain minimum 4 characters"],
      select: false,
    },
    picture: { type: String },
    storageSize: {
      type: Schema.Types.BigInt,
      default: 15n * 1024n ** 3n,
    },
    rootFolderId: {
      type: Schema.ObjectId,
      required: true,
      ref: "Folder",
      default: null,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    strict: "throw",
    versionKey: "__v",
    timestamps: true,
    toJSON: { transform: mongooseTransform },
    toObject: { transform: mongooseTransform },
  }
);

const User = model("User", userSchema);

export default User;
