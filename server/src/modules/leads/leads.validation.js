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
