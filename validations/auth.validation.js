import { z } from "zod";

// 1. Define Login Schema
export const loginSchema = z.object({
  body: z.object({
    // Note: Standard Zod syntax is usually z.string().email()
    email: z.email("Please enter a valid email"),

    password: z
      .string("Please enter a valid password string")
      .min(4, "Password must be 4 characters long"),
  }),
});

// 2. Define Register Schema
export const registerSchema = z.object({
  // Access the inner 'body' schema from loginSchema and extend IT
  body: loginSchema.shape.body.extend({
    name: z
      .string("Please enter a valid name")
      .min(3, "Name must be at least 3 characters long")
      .max(30, "Name must be at most 30 characters long"),
  }),
});
