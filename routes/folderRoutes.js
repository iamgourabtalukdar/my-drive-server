import { Router } from "express";
import {
  changeStarOfFolder,
  createFolder,
  getFolder,
  moveFolderToTrash,
  renameFolder,
} from "../controllers/folderController.js";

const router = Router();

// --- Routes for the base /folders endpoint ---
// GET /       -> Get the root folder's content
// POST /      -> Create a new folder (usually in the root or a specified parent)
router.route("/").get(getFolder).post(createFolder);

// --- Routes targeting a specific folder by its ID ---
// GET /:folderId      -> Get a specific folder's content
// PATCH /:folderId    -> Rename a specific folder
router.route("/:folderId").get(getFolder).patch(renameFolder);

// --- Routes for specific actions on a folder ---
// PATCH /:folderId/trash -> Move a specific folder to the trash
router.route("/:folderId/trash").patch(moveFolderToTrash);
router.route("/:folderId/starred").patch(changeStarOfFolder);

export default router;
