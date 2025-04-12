import { Router } from "express";
import {
  createFolder,
  getFolder,
  moveFolderToTrash,
  renameFolder,
  restoreFolderFromTrash,
  deleteFolder,
} from "../controllers/folderController.js";

const router = Router();

router.route("/").get(getFolder).post(createFolder);
router.route("/:folderId").get(getFolder).patch(renameFolder);
router.route("/:folderId/trash").patch(moveFolderToTrash).delete(deleteFolder);
router.route("/:folderId/restore").patch(restoreFolderFromTrash);

export default router;
