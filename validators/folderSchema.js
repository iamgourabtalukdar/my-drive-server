import { z } from "zod/v4";
import { objectIdSchema } from "./utils.js";
import { sanitizeInput } from "./sanitizer.js";

const folderNameSchema = z
  .string("Please enter a valid name string")
  .min(1, "Folder Name must be at least 1 characters long")
  .max(30, "Folder Name must be at most 30 characters long")
  .transform(sanitizeInput);

export const getFolderSchema = z.object({
  params: z.object({
    folderId: z.preprocess(
      (val) => (val ? val : undefined),
      objectIdSchema.optional()
    ),
  }),
});

export const createFolderSchema = z.object({
  body: z.object({
    name: folderNameSchema,
    parentFolderId: z.preprocess(
      (val) => (val ? val : undefined),
      objectIdSchema.optional()
    ),
  }),
});

export const renameFolderSchema = z.object({
  body: z.object({
    name: folderNameSchema,
  }),
  params: z.object({
    folderId: objectIdSchema,
  }),
});

export const moveFolderToTrashSchema = z.object({
  params: z.object({
    folderId: objectIdSchema,
  }),
});

export const changeStarOfFolderSchema = z.object({
  body: z.object({
    isStarred: z.boolean({
      required_error: "isStarred is required.",
      invalid_type_error: "isStarred must be a boolean (true or false).",
    }),
  }),
  params: z.object({
    folderId: objectIdSchema,
  }),
});
