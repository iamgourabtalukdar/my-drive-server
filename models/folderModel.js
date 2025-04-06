import { model, Schema } from "mongoose";

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
    starred: {
      type: Boolean,
      default: false,
    },
  },
  { strict: "throw", timestamps: true }
);

const Folder = model("folder", folderSchema);
export default Folder;
