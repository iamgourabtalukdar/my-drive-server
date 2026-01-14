import z from "zod";
import { folderNameSchema, objectIdSchema } from "./common.validation.js";

export const getFolderSchema = z.object({
  params: z.object({
    folderId: objectIdSchema.optional(),
  }),
});

export const createFolderSchema = z.object({
  body: z.object({
    name: folderNameSchema,
    parentFolderId: objectIdSchema.optional(),
  }),
});

export const updateFolderSchema = z.object({
  body: z.object({
    name: folderNameSchema.optional(),
    isTrashed: z.boolean().optional(),
    starred: z.boolean().optional(),
  }),
  params: z.object({
    folderId: objectIdSchema,
  }),
});

export const deleteFolderSchema = z.object({
  params: z.object({
    folderId: objectIdSchema.optional(),
  }),
});
