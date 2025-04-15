import { Router } from "express";
import path from "path";
import multer from "multer";
import {
  moveFileToTrash,
  renameFile,
  serveFile,
  uploadFiles,
  recentFile,
} from "../controllers/fileController.js";
import { generateFileIds } from "../middlewares/generateFileIDs.js";

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const fileId = req.generatedFileIds[req.fileIndex];
    req.fileIndex++;
    const ext = path.extname(file.originalname);
    cb(null, `${fileId}${ext}`);
  },
});

// const fileFilter = (req, file, cb) => {
//   const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
//   const extname = allowedTypes.test(
//     path.extname(file.originalname).toLowerCase()
//   );
//   const mimetype = allowedTypes.test(file.mimetype);
//   if (extname && mimetype) return cb(null, true);
//   cb(new Error("Only image, PDF, and doc files allowed"));
// };

const upload = multer({
  storage,
  // fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

const router = Router();
// Route
router.route("/recent").get(recentFile);
router.post("/upload", generateFileIds, upload.array("files"), uploadFiles);
router.route("/:fileId").get(serveFile).patch(renameFile);
router.route("/:fileId/trash").patch(moveFileToTrash);

export default router;
