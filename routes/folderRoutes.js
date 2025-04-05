import { Router } from "express";
import { getFolder } from "../controllers/folderController.js";

const router = Router();

router.get("/{*id}", getFolder);

export default router;
