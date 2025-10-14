import { z } from "zod/v4";
import { sanitizeInput } from "./sanitizer.js";

export const loginSchema = z.object({
  email: z.email("Please enter a valid email").transform(sanitizeInput),
  password: z
    .string("Please enter a valid password string")
    .min(4, "Password must be 4 characters long"),
});

export const registerSchema = loginSchema.extend({
  name: z
    .string("Please enter a valid name")
    .min(3, "Name must be at least 3 characters long")
    .max(30, "Name must be at most 30 characters long")
    .transform(sanitizeInput),
});
