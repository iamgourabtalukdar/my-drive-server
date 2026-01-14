import mongoose from "mongoose";
import { mongooseTransform } from "../utils/mongooseTransform.js";

const uploadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    key: { type: String, required: true },
    fileName: { type: String, required: true },
    extension: { type: String, required: true },
    contentType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    parentFolderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      required: true,
    },
    status: {
      type: String,
      enum: ["initiated", "completed", "used"],
      default: "initiated",
    },
  },
  {
    timestamps: true,
    toJSON: { transform: mongooseTransform },
    toObject: { transform: mongooseTransform },
  }
);

uploadSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 2 } // auto delete after 2 hours
);

const Upload = mongoose.model("Upload", uploadSchema);
export default Upload;
