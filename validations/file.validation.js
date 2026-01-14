import z from "zod";
import { fileNameSchema, objectIdSchema } from "./common.validation.js";

export const uploadInitiateSchema = z.object({
  body: z.object({
    name: fileNameSchema,
    size: z.number().positive("File size must be a positive number"),
    contentType: z.string().nonempty("Content type is required"),
    parentFolderId: objectIdSchema.optional(),
  }),
});

export const uploadCompleteSchema = z.object({
  body: z.object({
    uploadId: objectIdSchema,
  }),
});

export const serveFileSchema = z.object({
  params: z.object({
    fileId: objectIdSchema,
  }),
});

export const updateFileSchema = z.object({
  body: z.object({
    name: fileNameSchema.optional(),
    isTrashed: z.boolean().optional(),
    starred: z.boolean().optional(),
  }),
  params: z.object({
    fileId: objectIdSchema,
  }),
});

export const deleteFileSchema = z.object({
  params: z.object({
    fileId: objectIdSchema,
  }),
});
