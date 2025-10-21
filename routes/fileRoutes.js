import { Router } from "express";
import path from "path";
import multer from "multer";
import mongoose from "mongoose"; // Import mongoose here
import {
  moveFileToTrash,
  renameFile,
  serveFile,
  uploadFiles,
  recentFile,
  changeStarOfFile,
} from "../controllers/fileController.js";

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    // If the array doesn't exist on the request, create it.
    if (!req.generatedFileIds) {
      req.generatedFileIds = [];
    }

    // 1. Generate a new ObjectId for this specific file.
    const fileId = new mongoose.Types.ObjectId();

    // 2. Push it to our array so the final controller can use it.
    req.generatedFileIds.push(fileId);

    // 3. Use the new ID for the filename.
    const ext = path.extname(file.originalname);
    cb(null, `${fileId}${ext}`);
  },
});

const upload = multer({
  storage,
  // limits: { fileSize: 250 * 1024 * 1024 },
});

const router = Router();

router.post("/upload", upload.array("files"), uploadFiles);
router.route("/recent").get(recentFile);
router.route("/:fileId").get(serveFile).patch(renameFile);
router.route("/:fileId/trash").patch(moveFileToTrash);
router.route("/:fileId/starred").patch(changeStarOfFile);

export default router;
