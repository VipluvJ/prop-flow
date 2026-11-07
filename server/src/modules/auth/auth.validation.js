import { z } from "zod";

export const registerSchema = z.object({
  organizationName: z.string().trim().min(2).max(150),

  name: z.string().trim().min(2).max(120),

  email: z.string().trim().email().max(255),

  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1),
});
