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
  {
    strict: "throw",
    timestamps: true,
    versionKey: "__v",
    toJSON: {
      virtuals: true, // Include virtuals (like 'id')
      transform: (doc, ret) => {
        delete ret._id; // Remove _id
        delete ret.createdAt; // Remove createdAt
        delete ret.updatedAt; // Remove updatedAt
        delete ret.__v; // Remove __v
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret._id;
        delete ret.createdAt;
        delete ret.updatedAt;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// virtual key for id
fileSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

const File = model("File", fileSchema);
export default File;
