import { Router } from "express";

import {
  getRecentFiles,
  serveFile,
  updateFile,
  uploadComplete,
  uploadInitiate,
  deleteFile,
} from "../controllers/file.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  deleteFileSchema,
  serveFileSchema,
  updateFileSchema,
  uploadCompleteSchema,
  uploadInitiateSchema,
} from "../validations/file.validation.js";

const router = Router();

router.post("/upload/initiate", validate(uploadInitiateSchema), uploadInitiate);
router.post("/upload/complete", validate(uploadCompleteSchema), uploadComplete);

router.route("/recent").get(getRecentFiles);

router
  .route("/:fileId")
  .get(validate(serveFileSchema), serveFile) // Download/View
  .patch(validate(updateFileSchema), updateFile) // Handle Rename, Trash, Star, Move
  .delete(validate(deleteFileSchema), deleteFile); // PERMANENT Delete

export default router;
