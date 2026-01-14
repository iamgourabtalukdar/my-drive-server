import { Router } from "express";
import {
  emptyTrash,
  getTrashContent,
} from "../controllers/trash.controller.js";

const router = Router();

router.route("/").get(getTrashContent).delete(emptyTrash);

export default router;
