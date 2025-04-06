import { Router } from "express";
import { createFolder, getFolder } from "../controllers/folderController.js";

const router = Router();

router.get("/", getFolder);
router.get("/:folderId", getFolder);
router.post("/", createFolder);

export default router;
