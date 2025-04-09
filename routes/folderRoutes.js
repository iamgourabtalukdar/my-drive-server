import { Router } from "express";
import {
  createFolder,
  getFolder,
  renameFolder,
} from "../controllers/folderController.js";

const router = Router();

router.route("/").get(getFolder).post(createFolder);
router.route("/:folderId").get(getFolder).patch(renameFolder);

export default router;
