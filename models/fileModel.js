import { model, Schema } from "mongoose";

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
      ref: "User",
      required: true,
    },
    extension: {
      type: String,
    },
    mimetype: {
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
  },
  { strict: "throw", timestamps: true }
);

const File = model("file", fileSchema);
export default File;
