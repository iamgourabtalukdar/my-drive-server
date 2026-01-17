import z from "zod";

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID");

export const folderNameSchema = z
  .string("Please enter a valid name string")
  .trim()
  .min(1, "Folder Name must be at least 1 character long")
  .max(50, "Folder Name must be at most 50 characters long");

export const fileNameSchema = z
  .string("Please enter a valid name string")
  .trim()
  .min(1, "File Name must be at least 1 character long")
  .max(50, "File Name must be at most 50 characters long");
