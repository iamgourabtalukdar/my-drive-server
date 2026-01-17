import mongoose, { model, Schema } from "mongoose";
import { mongooseTransform } from "../utils/mongooseTransform.js";

const folderSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      minLength: [1, "Folder name must contain at least 1 character"],
      maxLength: [30, "Folder name must contain at most 30 character"],
    },
    userId: {
      type: Schema.ObjectId,
      ref: "User",
      required: true,
    },
    parentFolderId: {
      type: Schema.ObjectId,
      ref: "Folder",
      default: null,
    },
    size: {
      type: mongoose.Schema.Types.BigInt,
      default: 0n,
    },
    isStarred: {
      type: Boolean,
      default: false,
    },
    isTrashed: {
      type: Boolean,
      default: false,
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

const Folder = model("Folder", folderSchema);
export default Folder;
