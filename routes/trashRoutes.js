import { Router } from "express";
import { getTrashContent } from "../controllers/trashController.js";

const router = Router();

router.get("/", getTrashContent);
export default router;
