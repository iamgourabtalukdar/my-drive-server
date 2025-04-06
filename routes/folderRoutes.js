import { Router } from "express";
import { createFolder, getFolder } from "../controllers/folderController.js";

const router = Router();

router.get("/{*id}", getFolder);
router.post("/{*id}", createFolder);

export default router;
