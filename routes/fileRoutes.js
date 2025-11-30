import { Router } from "express";

import {
  moveFileToTrash,
  renameFile,
  serveFile,
  recentFile,
  changeStarOfFile,
  uploadInitiate,
  uploadComplete,
} from "../controllers/fileController.js";

const router = Router();

router.post("/upload/initiate", uploadInitiate);
router.post("/upload/complete", uploadComplete);
router.route("/recent").get(recentFile);
router.route("/:fileId").get(serveFile).patch(renameFile);
router.route("/:fileId/trash").patch(moveFileToTrash);
router.route("/:fileId/starred").patch(changeStarOfFile);

export default router;
