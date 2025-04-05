import { model, Schema } from "mongoose";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      minLength: [3, "Name Should contain 3 characters"],
      maxLength: [30, "Name Should not exceed 30 characters"],
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
      required: true,
    },
    rootFolderId: {
      type: Schema.ObjectId,
      required: true,
      ref: "Folder",
      default: null,
    },
  },
  { strict: "throw", timestamps: true }
);

const User = model("User", userSchema);

export default User;
