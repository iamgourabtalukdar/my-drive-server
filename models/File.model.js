import { model, Schema } from "mongoose";
import { mongooseTransform } from "../utils/mongooseTransform.js";

const fileSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      minLength: [1, "Folder name must contain at least 1 character"],
      maxLength: [50, "Folder name must contain at most 50 character"],
    },
    size: {
      type: Number,
      required: true,
    },
    extension: {
      type: String,
    },
    contentType: {
      type: String,
    },
    userId: {
      type: Schema.ObjectId,
      ref: "User",
      required: true,
    },
    parentFolderId: {
      type: Schema.ObjectId,
      ref: "Folder",
      required: true,
    },
    starred: {
      type: Boolean,
      default: false,
    },
    isTrashed: {
      type: Boolean,
      default: false,
    },
    s3Key: {
      type: String,
      required: true,
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

const File = model("File", fileSchema);
export default File;
