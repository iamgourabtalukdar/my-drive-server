import { Router } from "express";
import {
  deleteFile,
  deleteFolder,
  getTrashContent,
  restoreFileFromTrash,
  restoreFolderFromTrash,
} from "../controllers/trashController.js";

const router = Router();

router.get("/", getTrashContent);

router
  .route("/folder/:folderId")
  .patch(restoreFolderFromTrash)
  .delete(deleteFolder);

router.route("/file/:fileId").patch(restoreFileFromTrash).delete(deleteFile);

export default router;
