import { model, Schema } from "mongoose";

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
userSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

const User = model("User", userSchema);

export default User;
