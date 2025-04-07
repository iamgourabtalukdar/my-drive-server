// middleware/generateFileIds.js
import mongoose from "mongoose";

export const generateFileIds = (req, res, next) => {
  const fileCount = parseInt(req.headers["file-count"] || 0); // or use req.body
  req.generatedFileIds = Array.from(
    { length: fileCount },
    () => new mongoose.Types.ObjectId()
  );
  req.fileIndex = 0;
  next();
};
