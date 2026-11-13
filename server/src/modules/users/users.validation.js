import { z } from "zod";

// Create a new user
export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),

  email: z.string().trim().email().max(255),

  password: z.string().min(8).max(128),
});

// Validate query parameters when listing users
export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(10),

  search: z.string().trim().max(100).optional(),

  role: z.enum(["admin", "agent"]).optional(),

  isActive: z.enum(["true", "false"]).optional(),
});

// Validate user ID in URL parameters
export const userIdParamSchema = z.object({
  id: z.string().uuid(),
});

// Update name or email
export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),

    email: z.string().trim().email().max(255).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0);

// Change user role
export const changeUserRoleSchema = z.object({
  role: z.enum(["admin", "agent"]),
});

// Activate or deactivate a user
export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});
