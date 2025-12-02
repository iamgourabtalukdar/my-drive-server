import { z } from "zod/v4";
import { objectIdSchema } from "./utils.js";

export const deleteFileSchema = z.object({
  params: z.object({
    fileId: objectIdSchema,
  }),
});
export const deleteFolderSchema = z.object({
  params: z.object({
    folderId: objectIdSchema,
  }),
});
