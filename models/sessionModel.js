import { model, Schema } from "mongoose";

const sessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
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
sessionSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

sessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

const Session = model("Session", sessionSchema);

export default Session;
