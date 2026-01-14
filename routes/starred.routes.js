import { Router } from "express";
import { getStarredItems } from "../controllers/starred.controller.js";

const router = Router();

router.get("/", getStarredItems);
export default router;
