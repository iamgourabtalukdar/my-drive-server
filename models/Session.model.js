import { model, Schema } from "mongoose";
import { mongooseTransform } from "../utils/mongooseTransform.js";
import { MAX_COOKIE_AGE } from "../config/constants.js";

const sessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ip: {
      type: String,
    },

    userAgent: {
      type: String,
    },

    device: {
      type: String,
      os: String,
      browser: String,
    },

    lastActiveAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    strict: "throw",
    versionKey: "__v",
    timestamps: true,
    toJSON: { transform: mongooseTransform },
    toObject: { transform: mongooseTransform },
  },
);

sessionSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: MAX_COOKIE_AGE / 1000 },
);

const Session = model("Session", sessionSchema);

export default Session;
