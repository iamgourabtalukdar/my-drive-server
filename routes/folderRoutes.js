import { Router } from "express";
import {
  createFolder,
  getFolder,
  moveFolderToTrash,
  renameFolder,
} from "../controllers/folderController.js";

const router = Router();

router.route("/").get(getFolder).post(createFolder);
router.route("/:folderId").get(getFolder).patch(renameFolder);
router.route("/:folderId/trash").patch(moveFolderToTrash);

export default router;
