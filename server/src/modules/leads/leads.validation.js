import { z } from "zod";

export const createLeadSchema = z.object({
  name: z.string().trim().min(2).max(120),

  phone: z.string().trim().min(7).max(20),

  email: z.string().trim().email().max(255).optional(),

  projectId: z.string().uuid(),

  propertyType: z.string().trim().min(2).max(100),

  budget: z.number().positive(),

  source: z.string().trim().min(2).max(100),
});

export const listLeadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(10),

  search: z.string().trim().max(100).optional(),

  status: z
    .enum([
      "new",
      "contacted",
      "qualified",
      "site_visit",
      "negotiation",
      "booked",
      "lost",
      "unqualified",
    ])
    .optional(),

  projectId: z.string().uuid().optional(),
});

export const leadIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const updateLeadSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),

    phone: z.string().trim().min(7).max(20).optional(),

    email: z.string().trim().email().max(255).optional(),

    projectId: z.string().uuid().optional(),

    propertyType: z.string().trim().min(2).max(100).optional(),

    budget: z.number().positive().optional(),

    source: z.string().trim().min(2).max(100).optional(),

    status: z
      .enum([
        "new",
        "contacted",
        "qualified",
        "site_visit",
        "negotiation",
        "booked",
        "lost",
        "unqualified",
      ])
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
