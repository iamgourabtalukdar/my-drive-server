import mongoose from "mongoose";
import { z } from "zod/v4";

export const objectIdSchema = z
  .string("Please enter a valid ID")
  .refine((val) => mongoose.isValidObjectId(val), {
    message: "Invalid ID format",
  });
