import { Router } from "express";
import {
  createFolder,
  deleteFolder,
  getFolderContent,
  getRootFolder,
  updateFolder,
} from "../controllers/folder.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createFolderSchema,
  deleteFolderSchema,
  getFolderSchema,
  updateFolderSchema,
} from "../validations/folder.validation.js";

const router = Router();

router
  .route("/")
  .get(getRootFolder)
  .post(validate(createFolderSchema), createFolder);

router
  .route("/:folderId")
  .get(validate(getFolderSchema), getFolderContent)
  .patch(validate(updateFolderSchema), updateFolder)
  .delete(validate(deleteFolderSchema), deleteFolder);

export default router;
