import { z } from "zod";

// CREATE PROJECT
export const createProjectSchema = z.object({
  name: z.string().trim().min(2).max(150),
  location: z.string().trim().min(2).max(255),
});

// LIST PROJECTS
export const listProjectsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
});

// PROJECT ID
export const projectIdParamSchema = z.object({
  id: z.string().uuid(),
});

// UPDATE PROJECT
export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(2).max(150).optional(),
    location: z.string().trim().min(2).max(255).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0);
