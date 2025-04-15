import { Router } from "express";
import {
  changeStarredFile,
  changeStarredFolder,
  getStarredContent,
} from "../controllers/starredController.js";

const router = Router();

router.get("/", getStarredContent);
router.route("/file/:fileId").patch(changeStarredFile);
router.route("/folder/:folderId").patch(changeStarredFolder);
export default router;
